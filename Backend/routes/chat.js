import express from 'express';
import crypto from 'crypto';
import Chat from '../models/Chat.js';
import { authenticate } from '../middleware/auth.js';
import { deleteFromCloudinary } from '../utils/uploadToCloudinary.js';

const router = express.Router();

router.get('/history', authenticate, async (req, res) => {
  try {
    const chats = await Chat.find({ userId: req.userId })
      .sort({ updatedAt: -1 })
      .select('title createdAt updatedAt');
    res.json(chats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:chatId', authenticate, async (req, res) => {
  try {
    const chat = await Chat.findOne({ _id: req.params.chatId, userId: req.userId });
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    res.json(chat);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/save', authenticate, async (req, res) => {
  try {
    const { chatId, messages, title, uploadedFile } = req.body;
    
    if (chatId) {
      const existingChat = await Chat.findOne({ _id: chatId, userId: req.userId });
      if (!existingChat) {
        return res.status(404).json({ error: 'Chat not found' });
      }
      const updateData = { messages, title, updatedAt: Date.now() };
      if (uploadedFile) {
        updateData.$push = { uploadedFiles: uploadedFile };
      }
      const chat = await Chat.findOneAndUpdate(
        { _id: chatId, userId: req.userId },
        updateData,
        { new: true }
      );
      return res.json(chat);
    }
    
    const chat = new Chat({
      userId: req.userId,
      messages,
      title: title || messages[0]?.content.slice(0, 50) || 'New Chat',
      uploadedFiles: uploadedFile ? [uploadedFile] : []
    });
    await chat.save();
    res.json(chat);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:chatId/rename', authenticate, async (req, res) => {
  try {
    const chat = await Chat.findOneAndUpdate(
      { _id: req.params.chatId, userId: req.userId },
      { title: req.body.title },
      { new: true }
    );
    res.json(chat);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:chatId/share', authenticate, async (req, res) => {
  try {
    const chat = await Chat.findOne({ _id: req.params.chatId, userId: req.userId });
    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    
    if (!chat.shareToken) {
      chat.shareToken = crypto.randomBytes(16).toString('hex');
      await chat.save();
    }
    res.json({ shareToken: chat.shareToken });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/shared/:shareToken', async (req, res) => {
  try {
    const chat = await Chat.findOne({ shareToken: req.params.shareToken }).select('-userId');
    if (!chat) return res.status(404).json({ error: 'Chat not found' });
    res.json(chat);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/shared/:shareToken/fork', authenticate, async (req, res) => {
  try {
    const originalChat = await Chat.findOne({ shareToken: req.params.shareToken });
    if (!originalChat) return res.status(404).json({ error: 'Chat not found' });
    
    const newChat = new Chat({
      userId: req.userId,
      title: originalChat.title + ' (Copy)',
      messages: originalChat.messages,
      uploadedFiles: originalChat.uploadedFiles
    });
    await newChat.save();
    res.json(newChat);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:chatId', authenticate, async (req, res) => {
  try {
    const chat = await Chat.findOne({ _id: req.params.chatId, userId: req.userId });
    if (chat) {
      // Delete files from uploadedFiles array
      if (chat.uploadedFiles) {
        for (const file of chat.uploadedFiles) {
          try {
            await deleteFromCloudinary(file.publicId);
          } catch (e) {
            console.error('Failed to delete file:', e);
          }
        }
      }
      // Extract and delete files from message content
      if (chat.messages) {
        for (const msg of chat.messages) {
          const imgMatch = msg.content.match(/!\[.*?\]\((https:\/\/res\.cloudinary\.com\/[^)]+)\)/);
          if (imgMatch) {
            const publicId = imgMatch[1].split('/').slice(-2).join('/').split('.')[0];
            try {
              await deleteFromCloudinary(publicId);
            } catch (e) {
              console.error('Failed to delete image:', e);
            }
          }
        }
      }
    }
    await Chat.findOneAndDelete({ _id: req.params.chatId, userId: req.userId });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

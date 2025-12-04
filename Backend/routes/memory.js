import express from 'express';
import UserMemory from '../models/UserMemory.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    let memory = await UserMemory.findOne({ userId: req.userId });
    if (!memory) {
      memory = new UserMemory({ userId: req.userId, memories: [], storeHistory: true });
      await memory.save();
    }
    res.json(memory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/add', authenticate, async (req, res) => {
  try {
    const { memory } = req.body;
    let userMemory = await UserMemory.findOne({ userId: req.userId });
    if (!userMemory) {
      userMemory = new UserMemory({ userId: req.userId, memories: [memory] });
    } else {
      userMemory.memories.push(memory);
    }
    await userMemory.save();
    res.json(userMemory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/settings', authenticate, async (req, res) => {
  try {
    const { storeHistory } = req.body;
    let memory = await UserMemory.findOne({ userId: req.userId });
    if (!memory) {
      memory = new UserMemory({ userId: req.userId, storeHistory });
    } else {
      memory.storeHistory = storeHistory;
    }
    await memory.save();
    res.json(memory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/clear', authenticate, async (req, res) => {
  try {
    await UserMemory.findOneAndUpdate(
      { userId: req.userId },
      { memories: [] },
      { new: true }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:index', authenticate, async (req, res) => {
  try {
    const memory = await UserMemory.findOne({ userId: req.userId });
    if (memory) {
      memory.memories.splice(req.params.index, 1);
      await memory.save();
    }
    res.json(memory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

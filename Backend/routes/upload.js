import express from 'express';
import multer from 'multer';
import { uploadToCloudinary } from '../utils/uploadToCloudinary.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/file', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const result = await uploadToCloudinary(req.file.buffer);
    
    res.json({
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      type: req.file.mimetype
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed', message: error.message });
  }
});

router.post('/delete', async (req, res) => {
  try {
    const { publicId } = req.body;
    if (!publicId) {
      return res.status(400).json({ error: 'No publicId provided' });
    }

    // Try to delete with retries
    let retries = 3;
    let deleted = false;
    
    while (retries > 0 && !deleted) {
      try {
        const { deleteFromCloudinary } = await import('../utils/uploadToCloudinary.js');
        await deleteFromCloudinary(publicId);
        deleted = true;
      } catch (error) {
        retries--;
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    res.json({ success: deleted });
  } catch (error) {
    console.error('Delete error:', error);
    res.json({ success: false });
  }
});

export default router;

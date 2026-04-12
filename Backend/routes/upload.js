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

// Store a file in MongoDB and return a download URL
router.post('/store-download', async (req, res) => {
  try {
    const { filename, mimetype, data, size } = req.body;
    if (!filename || !data) {
      return res.status(400).json({ error: 'Missing filename or data' });
    }

    const FileDownload = (await import('../models/FileDownload.js')).default;
    const file = await FileDownload.create({ filename, mimetype: mimetype || 'application/octet-stream', data, size });
    
    res.json({
      success: true,
      downloadId: file._id,
      downloadUrl: `/api/upload/download/${file._id}`
    });
  } catch (error) {
    console.error('Store download error:', error);
    res.status(500).json({ error: 'Failed to store file' });
  }
});

// Serve a file from MongoDB by ID
router.get('/download/:id', async (req, res) => {
  try {
    console.log(`[DOWNLOAD] Request for file ID: ${req.params.id}`);
    const FileDownload = (await import('../models/FileDownload.js')).default;
    const file = await FileDownload.findById(req.params.id);
    
    if (!file) {
      console.warn(`[DOWNLOAD] File not found: ${req.params.id}`);
      return res.status(404).json({ error: 'File not found or expired' });
    }

    console.log(`[DOWNLOAD] Found file: ${file.filename} (${file.size} bytes) - mime: ${file.mimetype}`);
    
    // Validate base64 data
    if (!file.data || typeof file.data !== 'string') {
      console.error(`[DOWNLOAD] Invalid file data for ${file._id}: data is ${typeof file.data}`);
      return res.status(500).json({ error: 'Invalid file data in database' });
    }

    try {
      const buffer = Buffer.from(file.data, 'base64');
      console.log(`[DOWNLOAD] Buffer decoded: ${buffer.length} bytes (original: ${file.size})`);
      
      if (buffer.length === 0) {
        console.error(`[DOWNLOAD] Empty buffer after decoding for ${file.filename}`);
        return res.status(500).json({ error: 'Empty file buffer' });
      }

      // Set headers
      res.setHeader('Content-Type', file.mimetype || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
      res.setHeader('Content-Length', buffer.length);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      
      console.log(`[DOWNLOAD] Sending file: ${file.filename}`);
      res.send(buffer);
    } catch (bufferError) {
      console.error(`[DOWNLOAD] Buffer conversion error for ${file.filename}:`, bufferError.message);
      return res.status(500).json({ error: 'Failed to decode file data' });
    }
  } catch (error) {
    console.error('[DOWNLOAD] Error:', error.message, error.stack);
    res.status(500).json({ error: 'Download failed' });
  }
});

// Proxy endpoint to download files from third-party sources avoiding CORS
router.get('/proxy', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url || !url.startsWith('http')) {
      return res.status(400).json({ error: 'Invalid or missing URL' });
    }

    // Attempt basic fetch for any URL
    const response = await fetch(url);
    if (response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType) res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      const arrayBuffer = await response.arrayBuffer();
      return res.send(Buffer.from(arrayBuffer));
    }

    // If it fails, fallback to passing it through Private Download API if it's Cloudinary
    if (url.includes('res.cloudinary.com')) {
      const urlMatch = url.match(/res\.cloudinary\.com\/[^/]+\/(raw|image|video)\/upload\/(?:v\d+\/)?(.+)$/);
      if (urlMatch) {
        const cloudinary = (await import('../config/cloudinary.js')).default;
        const privateUrl = cloudinary.utils.private_download_url(urlMatch[2], '', {
          resource_type: urlMatch[1],
          expires_at: Math.floor(Date.now() / 1000) + 3600
        });

        const privResponse = await fetch(privateUrl);
        if (privResponse.ok) {
          const contentType = privResponse.headers.get('content-type');
          if (contentType) res.setHeader('Content-Type', contentType);
          res.setHeader('Cache-Control', 'public, max-age=3600');
          const arrayBuffer = await privResponse.arrayBuffer();
          return res.send(Buffer.from(arrayBuffer));
        }
      }
    }

    res.status(response.status).json({ error: 'Failed to proxy resource' });
  } catch (error) {
    console.error('Proxy download error:', error);
    res.status(500).json({ error: 'Proxy download failed' });
  }
});

export default router;

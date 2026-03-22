import express from 'express';
import jwt from 'jsonwebtoken';
import UsageStats from '../models/UsageStats.js';

const router = express.Router();

// Auth middleware
const auth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// GET /api/usage - Get user's usage stats
router.get('/', auth, async (req, res) => {
  try {
    const usage = await UsageStats.findOne({ userId: req.userId });
    if (!usage) {
      return res.json({ stats: {}, totalMessages: 0 });
    }

    // Convert Map to plain object
    const statsObj = {};
    if (usage.stats) {
      for (const [key, value] of usage.stats) {
        statsObj[key] = {
          count: value.count || 0,
          lastUsed: value.lastUsed
        };
      }
    }

    res.json({
      stats: statsObj,
      totalMessages: usage.totalMessages || 0,
      createdAt: usage.createdAt
    });
  } catch (error) {
    console.error('Failed to fetch usage stats:', error);
    res.status(500).json({ error: 'Failed to fetch usage stats' });
  }
});

export default router;

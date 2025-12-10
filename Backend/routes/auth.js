import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

router.post('/signup', async (req, res) => {
  try {
    if (!User.db || User.db.readyState !== 1) {
      return res.status(503).json({ error: 'Database not available. Please install MongoDB.' });
    }
    const { email, password, name } = req.body;
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    // Validate password strength
    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }
    if (!/[A-Z]/.test(password)) {
      return res.status(400).json({ error: 'Password must contain at least one uppercase letter' });
    }
    if (!/[a-z]/.test(password)) {
      return res.status(400).json({ error: 'Password must contain at least one lowercase letter' });
    }
    if (!/[0-9]/.test(password)) {
      return res.status(400).json({ error: 'Password must contain at least one number' });
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return res.status(400).json({ error: 'Password must contain at least one special character' });
    }
    
    // Validate name
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ error: 'Name must be at least 2 characters long' });
    }
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const user = new User({ email, password, name });
    await user.save();

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: user._id, email, name, avatar: user.avatar } });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    if (!User.db || User.db.readyState !== 1) {
      return res.status(503).json({ error: 'Database not available. Please install MongoDB.' });
    }
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await user.comparePassword(password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: user._id, email: user.email, name: user.name, avatar: user.avatar } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/google', async (req, res) => {
  try {
    if (!User.db || User.db.readyState !== 1) {
      return res.status(503).json({ error: 'Database not available. Please install MongoDB.' });
    }
    const { email, name, avatar, googleId } = req.body;
    
    let user = await User.findOne({ $or: [{ email }, { googleId }] });
    if (!user) {
      user = new User({ email, name, avatar, googleId });
      await user.save();
    } else if (!user.googleId) {
      user.googleId = googleId;
      if (avatar) user.avatar = avatar;
      await user.save();
    }

    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: user._id, email: user.email, name: user.name, avatar: user.avatar } });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

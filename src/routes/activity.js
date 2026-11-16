// src/routes/activity.js
import express from 'express';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Protected activity route – requires valid authenticated user
router.get('/', protect, (req, res) => {
  res.json({ message: 'Activity route placeholder', user: req.user });
});

export default router;

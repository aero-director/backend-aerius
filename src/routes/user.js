// src/routes/user.js
import express from 'express';
import { getProfile, updateProfile, changePassword } from '../controllers/userController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/profile', protect, getProfile);
router.patch('/profile', protect, updateProfile);
router.put('/profile', protect, updateProfile);
router.patch('/change-password', protect, changePassword);

export default router;

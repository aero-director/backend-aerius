// src/routes/admin.js
import express from 'express';
import {
  adminLogin,
  getDashboard,
  listUsers,
  getUser,
  toggleVerifyUser,
  deleteUser,
} from '../controllers/adminController.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

// Public route for static or database admin authentication
router.post('/login', adminLogin);

// Protected routes requiring authentication & admin role
router.get('/dashboard', protect, admin, getDashboard);
router.get('/users', protect, admin, listUsers);
router.get('/users/:id', protect, admin, getUser);
router.patch('/users/:id/verify', protect, admin, toggleVerifyUser);
router.delete('/users/:id', protect, admin, deleteUser);

export default router;

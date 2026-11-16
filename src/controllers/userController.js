// src/controllers/userController.js
import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const profileUpdateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  username: z.string().min(2, 'Username must be at least 2 characters').optional(),
  email: z.string().min(3).optional(),
  phone: z.string().optional(),
  age: z.union([z.number(), z.string()]).optional(),
  country: z.string().optional(),
  avatar: z.string().optional(),
});

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Current password required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

// GET /api/users/profile
export const getProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-passwordHash');
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ user });
});

// PATCH /api/users/profile
export const updateProfile = asyncHandler(async (req, res) => {
  const parsed = profileUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    const errorMsg = parsed.error.errors.map(err => err.message).join(', ');
    return res.status(400).json({ error: errorMsg, errors: parsed.error.errors });
  }

  const updates = { ...parsed.data };

  if (updates.email) {
    updates.email = updates.email.toLowerCase().trim();
    const existing = await User.findOne({ email: updates.email, _id: { $ne: req.user._id } });
    if (existing) {
      return res.status(400).json({ error: 'Email already in use by another account' });
    }
  }

  if (updates.username) {
    updates.username = updates.username.toLowerCase().trim();
    const existing = await User.findOne({ username: updates.username, _id: { $ne: req.user._id } });
    if (existing) {
      return res.status(400).json({ error: 'Username already in use by another account' });
    }
  }

  if (updates.age !== undefined && updates.age !== null && updates.age !== '') {
    updates.age = Number(updates.age);
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: updates },
    { new: true, runValidators: true }
  ).select('-passwordHash');

  res.json({ message: 'Profile updated successfully', user });
});

// PATCH /api/users/change-password
export const changePassword = asyncHandler(async (req, res) => {
  const parsed = passwordChangeSchema.safeParse(req.body);
  if (!parsed.success) {
    const errorMsg = parsed.error.errors.map(err => err.message).join(', ');
    return res.status(400).json({ error: errorMsg });
  }
  const { currentPassword, newPassword } = parsed.data;
  const user = await User.findById(req.user._id);
  const match = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!match) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }
  const salt = await bcrypt.genSalt(10);
  user.passwordHash = await bcrypt.hash(newPassword, salt);
  await user.save();
  res.json({ message: 'Password updated successfully' });
});

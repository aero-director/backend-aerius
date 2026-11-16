// src/controllers/adminController.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { generateToken } from '../utils/jwt.js';
import { STATIC_ADMIN } from '../config/db.js';

// @desc    Admin login using predefined static credentials or admin credentials
// @route   POST /api/admin/login
export const adminLogin = asyncHandler(async (req, res) => {
  const { identifier, email, username, password } = req.body;
  const loginInput = (identifier || email || username || '').trim().toLowerCase();

  const isStaticAdmin =
    (loginInput === STATIC_ADMIN.email.toLowerCase() ||
      loginInput === STATIC_ADMIN.username.toLowerCase() ||
      loginInput === 'admin') &&
    password === STATIC_ADMIN.password;

  let adminUser = null;

  if (isStaticAdmin) {
    adminUser = await User.findOne({
      $or: [
        { email: STATIC_ADMIN.email.toLowerCase() },
        { username: STATIC_ADMIN.username.toLowerCase() },
      ],
    });

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(STATIC_ADMIN.password, salt);

    if (!adminUser) {
      adminUser = new User({
        name: STATIC_ADMIN.name,
        email: STATIC_ADMIN.email.toLowerCase(),
        username: STATIC_ADMIN.username.toLowerCase(),
        role: 'admin',
        isVerified: true,
        emailVerified: true,
        passwordHash,
      });
      await adminUser.save();
    } else {
      let needsSave = false;
      if (adminUser.role !== 'admin') {
        adminUser.role = 'admin';
        needsSave = true;
      }
      if (!adminUser.isVerified) {
        adminUser.isVerified = true;
        needsSave = true;
      }
      if (needsSave) {
        await adminUser.save();
      }
    }
  } else {
    // Check MongoDB for user with role === 'admin'
    const user = await User.findOne({
      $or: [{ email: loginInput }, { username: loginInput }],
      role: 'admin',
    });

    if (user) {
      const match = await bcrypt.compare(password, user.passwordHash);
      if (match) {
        adminUser = user;
      }
    }
  }

  if (!adminUser) {
    return res.status(401).json({ error: 'Invalid admin credentials' });
  }

  adminUser.lastActiveAt = new Date();
  await adminUser.save();

  const token = generateToken(adminUser._id);
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({
    message: 'Admin authenticated successfully',
    token,
    user: {
      id: adminUser._id,
      _id: adminUser._id,
      name: adminUser.name,
      username: adminUser.username,
      email: adminUser.email,
      role: 'admin',
      isVerified: true,
      avatar: adminUser.avatar,
    },
  });
});

// @desc    Dashboard overview stats
// @route   GET /api/admin/dashboard
export const getDashboard = asyncHandler(async (req, res) => {
  const totalCadets = await User.countDocuments({ role: { $ne: 'admin' } });
  const verifiedCadets = await User.countDocuments({ role: { $ne: 'admin' }, isVerified: true });
  const pendingCadets = totalCadets - verifiedCadets;

  const recentRegistrations = await User.find({ role: { $ne: 'admin' } })
    .sort({ createdAt: -1 })
    .limit(5)
    .select('-passwordHash');

  res.json({
    totalCadets,
    verifiedCadets,
    pendingCadets,
    recentRegistrations,
  });
});

// @desc    List all cadets with search and status filter
// @route   GET /api/admin/users
export const listUsers = asyncHandler(async (req, res) => {
  const { search, status } = req.query;
  const filter = { role: { $ne: 'admin' } };

  if (status === 'verified') {
    filter.isVerified = true;
  } else if (status === 'unverified' || status === 'pending') {
    filter.isVerified = { $ne: true };
  }

  if (search && search.trim()) {
    const q = search.trim();
    filter.$or = [
      { name: { $regex: q, $options: 'i' } },
      { email: { $regex: q, $options: 'i' } },
      { username: { $regex: q, $options: 'i' } },
      { phone: { $regex: q, $options: 'i' } },
      { country: { $regex: q, $options: 'i' } },
    ];
  }

  const users = await User.find(filter)
    .sort({ createdAt: -1 })
    .select('-passwordHash');

  const total = await User.countDocuments(filter);
  const totalVerified = await User.countDocuments({ role: { $ne: 'admin' }, isVerified: true });
  const totalAll = await User.countDocuments({ role: { $ne: 'admin' } });
  const totalPending = totalAll - totalVerified;

  res.json({
    users,
    total,
    counts: {
      all: totalAll,
      verified: totalVerified,
      pending: totalPending,
    },
  });
});

// @desc    Get single user details
// @route   GET /api/admin/users/:id
export const getUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  const user = await User.findById(id).select('-passwordHash');
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({ user });
});

// @desc    Toggle or set user verification tag
// @route   PATCH /api/admin/users/:id/verify
export const toggleVerifyUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isVerified } = req.body;

  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  const user = await User.findById(id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Toggle or assign boolean
  user.isVerified = typeof isVerified === 'boolean' ? isVerified : !user.isVerified;
  await user.save();

  res.json({
    message: `Cadet ${user.name} is now ${user.isVerified ? 'VERIFIED' : 'UNVERIFIED'}`,
    user: {
      id: user._id,
      _id: user._id,
      name: user.name,
      email: user.email,
      username: user.username,
      isVerified: user.isVerified,
      role: user.role,
    },
  });
});

// @desc    Delete cadet user
// @route   DELETE /api/admin/users/:id
export const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  const user = await User.findById(id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (user.role === 'admin') {
    return res.status(403).json({ error: 'Cannot delete an administrator account' });
  }

  await User.findByIdAndDelete(id);

  res.json({
    message: `Cadet ${user.name} (${user.email}) deleted successfully`,
    deletedId: id,
  });
});

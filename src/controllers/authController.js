// src/controllers/authController.js
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import User from '../models/User.js';
import { generateToken } from '../utils/jwt.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { registerSchema, loginSchema, emailSchema, resetPasswordSchema, forgotPasswordSchema } from '../validators/auth.js';
import { STATIC_ADMIN } from '../config/db.js';

// @desc    Register new user
// @route   POST /api/auth/register
export const register = asyncHandler(async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    const errorMsg = parsed.error.errors.map(err => err.message).join(', ');
    return res.status(400).json({ error: errorMsg, errors: parsed.error.errors });
  }

  const { name, email, username, phone, age, password, country } = parsed.data;
  const cleanEmail = email.toLowerCase().trim();
  const cleanUsername = username ? username.toLowerCase().trim() : cleanEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '');

  // Check if existing user with email or username
  const existingUser = await User.findOne({
    $or: [
      { email: cleanEmail },
      ...(cleanUsername ? [{ username: cleanUsername }] : [])
    ]
  });

  if (existingUser) {
    if (existingUser.email === cleanEmail) {
      return res.status(400).json({ error: 'This email is already registered. Please log in.' });
    }
    return res.status(400).json({ error: 'This username is already taken. Please choose another.' });
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const user = new User({
    name: name.trim(),
    email: cleanEmail,
    username: cleanUsername,
    phone: phone ? phone.trim() : '',
    age: age ? Number(age) : undefined,
    country: country ? country.trim() : '',
    passwordHash,
    emailVerified: true,
  });

  await user.save();

  // Create JWT token and set cookie so the user is logged in immediately
  const token = generateToken(user._id);
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.status(201).json({
    message: 'Account created successfully!',
    token,
    user: {
      id: user._id,
      _id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
      phone: user.phone,
      age: user.age,
      avatar: user.avatar,
      country: user.country,
      role: user.role,
      isVerified: user.isVerified || false,
      emailVerified: true,
    },
  });
});

// @desc    Login user (supports email or username)
// @route   POST /api/auth/login
export const login = asyncHandler(async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    const errorMsg = parsed.error.errors.map(err => err.message).join(', ');
    return res.status(400).json({ error: errorMsg });
  }

  const { email, password } = parsed.data;
  const identifier = email.trim().toLowerCase();

  const isStaticAdmin =
    (identifier === STATIC_ADMIN.email.toLowerCase() ||
      identifier === STATIC_ADMIN.username.toLowerCase() ||
      identifier === 'admin') &&
    password === STATIC_ADMIN.password;

  let user = await User.findOne({
    $or: [
      { email: identifier },
      { username: identifier }
    ]
  });

  if (isStaticAdmin) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(STATIC_ADMIN.password, salt);

    if (!user) {
      user = new User({
        name: STATIC_ADMIN.name,
        email: STATIC_ADMIN.email.toLowerCase(),
        username: STATIC_ADMIN.username.toLowerCase(),
        role: 'admin',
        isVerified: true,
        emailVerified: true,
        passwordHash,
      });
      await user.save();
    } else {
      let needsSave = false;
      if (user.role !== 'admin') {
        user.role = 'admin';
        needsSave = true;
      }
      if (!user.isVerified) {
        user.isVerified = true;
        needsSave = true;
      }
      if (needsSave) {
        await user.save();
      }
    }
  } else {
    if (!user) {
      return res.status(401).json({ error: 'Invalid username/email or password' });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid username/email or password' });
    }
  }

  user.lastActiveAt = new Date();
  await user.save();

  const token = generateToken(user._id);
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({
    message: 'Logged in successfully',
    token,
    user: {
      id: user._id,
      _id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
      phone: user.phone,
      age: user.age,
      avatar: user.avatar,
      role: user.role,
      country: user.country,
      isVerified: user.isVerified || false,
      emailVerified: user.emailVerified,
    },
  });
});

// @desc    Logout user (clear cookie)
// @route   POST /api/auth/logout
export const logout = asyncHandler(async (req, res) => {
  res.clearCookie('token', { httpOnly: true, sameSite: 'strict' });
  res.json({ message: 'Logged out successfully' });
});

// @desc    Get current authenticated user
// @route   GET /api/auth/me
export const getMe = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});

// @desc    Verify email (kept for compatibility)
// @route   POST /api/auth/verify-email
export const verifyEmail = asyncHandler(async (req, res) => {
  res.json({ message: 'Email verified' });
});

// @desc    Resend verification email
// @route   POST /api/auth/resend-verification
export const resendVerification = asyncHandler(async (req, res) => {
  res.json({ message: 'Verification not required' });
});

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
export const forgotPassword = asyncHandler(async (req, res) => {
  res.json({ message: 'If an account exists, instructions have been prepared' });
});

// @desc    Reset password
// @route   POST /api/auth/reset-password
export const resetPassword = asyncHandler(async (req, res) => {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors });
  }
  const { token, password } = parsed.data;
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    passwordResetTokenHash: tokenHash,
    passwordResetExpires: { $gt: Date.now() },
  });
  if (!user) {
    return res.status(400).json({ error: 'Invalid or expired reset token' });
  }
  const salt = await bcrypt.genSalt(10);
  user.passwordHash = await bcrypt.hash(password, salt);
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
  res.json({ message: 'Password has been reset successfully' });
});

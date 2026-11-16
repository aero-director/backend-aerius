// src/models/User.js
import mongoose from 'mongoose';
import crypto from 'crypto';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    username: { type: String, trim: true, lowercase: true },
    phone: { type: String, default: '' },
    age: { type: Number },
    avatar: { type: String, default: '' },
    passwordHash: { type: String, required: true },
    emailVerified: { type: Boolean, default: true },
    emailVerificationTokenHash: { type: String },
    emailVerificationExpires: { type: Date },
    passwordResetTokenHash: { type: String },
    passwordResetExpires: { type: Date },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    country: { type: String, default: '' },
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    lastActiveAt: { type: Date },
  },
  { timestamps: true }
);

// Helper to generate token and store hash
userSchema.methods.createEmailVerificationToken = function () {
  const token = crypto.randomBytes(32).toString('hex');
  this.emailVerificationTokenHash = crypto.createHash('sha256').update(token).digest('hex');
  this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24h
  return token;
};

userSchema.methods.createPasswordResetToken = function () {
  const token = crypto.randomBytes(32).toString('hex');
  this.passwordResetTokenHash = crypto.createHash('sha256').update(token).digest('hex');
  this.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1h
  return token;
};

export default mongoose.model('User', userSchema);

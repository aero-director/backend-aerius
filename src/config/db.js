// src/config/db.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

export const STATIC_ADMIN = {
  email: 'admin@aerius.com',
  username: 'aeriusadmin',
  password: 'AeriusAdmin@2026',
  name: 'Flight Deck Administrator',
};

export const seedAdmin = async () => {
  try {
    let adminUser = await User.findOne({
      $or: [
        { email: STATIC_ADMIN.email },
        { username: STATIC_ADMIN.username }
      ]
    });

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(STATIC_ADMIN.password, salt);

    if (!adminUser) {
      adminUser = new User({
        name: STATIC_ADMIN.name,
        email: STATIC_ADMIN.email,
        username: STATIC_ADMIN.username,
        role: 'admin',
        isVerified: true,
        emailVerified: true,
        passwordHash,
      });
      await adminUser.save();
      console.log('✅ Static Admin account initialized:', STATIC_ADMIN.email);
    } else {
      adminUser.role = 'admin';
      adminUser.isVerified = true;
      adminUser.passwordHash = passwordHash;
      await adminUser.save();
      console.log('✅ Static Admin account verified/updated:', STATIC_ADMIN.email);
    }
  } catch (err) {
    console.error('Error seeding admin account:', err);
  }
};

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // options are now default in mongoose 7
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    // Initialize static admin user automatically
    await seedAdmin();
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

export default connectDB;

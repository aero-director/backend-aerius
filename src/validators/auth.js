// src/validators/auth.js
import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().min(3, 'Email or username is required'),
  username: z.string().optional(),
  phone: z.string().optional(),
  age: z.union([z.number(), z.string()]).optional(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().optional(),
  country: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().min(1, 'Email or username is required'),
  password: z.string().min(1, 'Password required'),
});

export const emailSchema = z.object({
  token: z.string().min(1, 'Token required'),
  email: z.string().optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'Email is required'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

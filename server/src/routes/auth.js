import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { env } from '../config/env.js';
import { authenticate, COOKIE_NAME } from '../middleware/auth.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { publicUser } from '../utils/user.js';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const attempts = new Map();

function getRecentAttempts(ip) {
  const now = Date.now();
  const windowMs = env.LOGIN_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000;
  const recent = (attempts.get(ip) ?? []).filter((timestamp) => now - timestamp < windowMs);
  attempts.set(ip, recent);
  return recent;
}

function recordFailedAttempt(ip) {
  const recent = getRecentAttempts(ip);
  recent.push(Date.now());
  attempts.set(ip, recent);
}

function loginFailure(status = 401, code = 'INVALID_CREDENTIALS') {
  return new AppError('Invalid email or password', status, code);
}

export const login = asyncHandler(async (req, res) => {
  if (getRecentAttempts(req.ip).length >= env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS) {
    throw new AppError(
      'Too many login attempts. Please try again in 15 minutes.',
      429,
      'AUTH_RATE_LIMITED',
    );
  }

  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    recordFailedAttempt(req.ip);
    throw loginFailure();
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (!user || !user.isActive || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    recordFailedAttempt(req.ip);
    throw loginFailure();
  }

  const token = jwt.sign({}, env.JWT_SECRET, { subject: user.id, expiresIn: '8h' });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    maxAge: 8 * 60 * 60 * 1000,
  });
  res.json({ user: publicUser(user) });
});

export const logout = asyncHandler(async (req, res) => {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
  });
  res.status(204).send();
});

export const me = [
  authenticate,
  asyncHandler(async (req, res) => {
    res.json({ user: publicUser(req.user) });
  }),
];

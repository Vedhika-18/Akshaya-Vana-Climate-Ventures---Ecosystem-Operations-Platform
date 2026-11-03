import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { publicUser } from '../utils/user.js';

const role = z.enum(['ADMIN', 'MANAGER', 'FIELD_OFFICER', 'VIEWER']);
const createUserSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role,
});
const updateUserSchema = z.object({
  name: z.string().trim().min(1),
  role,
  isActive: z.boolean(),
});

function validationError(error) {
  return new AppError('Validation failed.', 400, 'VALIDATION_ERROR', error.issues);
}

function duplicateEmail(error) {
  if (error?.code === 'P2002' && error.meta?.target?.includes('email')) {
    return new AppError('A user with that email already exists.', 409, 'DUPLICATE_EMAIL');
  }
  return error;
}

export const userMiddleware = [authenticate, authorize('ADMIN')];

export const listUsers = asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'asc' } });
  res.json({ users: users.map(publicUser) });
});

export const createUser = asyncHandler(async (req, res) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) throw validationError(parsed.error);

  try {
    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email.toLowerCase(),
        passwordHash: await bcrypt.hash(parsed.data.password, 12),
        role: parsed.data.role,
      },
    });
    res.status(201).json({ user: publicUser(user) });
  } catch (error) {
    throw duplicateEmail(error);
  }
});

export const updateUser = asyncHandler(async (req, res) => {
  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) throw validationError(parsed.error);

  if (req.params.id === req.user.id && (!parsed.data.isActive || parsed.data.role !== 'ADMIN')) {
    throw new AppError('An admin cannot deactivate or demote themselves.', 400, 'SELF_MODIFICATION_NOT_ALLOWED');
  }

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: parsed.data,
  }).catch((error) => {
    if (error?.code === 'P2025') {
      throw new AppError('User not found.', 404, 'NOT_FOUND');
    }
    throw error;
  });
  res.json({ user: publicUser(user) });
});

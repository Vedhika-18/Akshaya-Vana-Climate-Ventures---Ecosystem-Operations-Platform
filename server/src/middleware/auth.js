import jwt from 'jsonwebtoken';
import { prisma } from '../db/prisma.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

const COOKIE_NAME = 'av_session';

export function authenticate(req, res, next) {
  const token = req.cookies[COOKIE_NAME];
  if (!token) {
    return next(new AppError('Authentication required.', 401, 'UNAUTHENTICATED'));
  }

  let payload;
  try {
    payload = jwt.verify(token, env.JWT_SECRET);
  } catch {
    return next(new AppError('Authentication required.', 401, 'UNAUTHENTICATED'));
  }

  if (typeof payload !== 'object' || typeof payload.sub !== 'string') {
    return next(new AppError('Authentication required.', 401, 'UNAUTHENTICATED'));
  }

  prisma.user.findUnique({ where: { id: payload.sub } })
    .then((user) => {
      if (!user || !user.isActive) {
        return next(new AppError('Authentication required.', 401, 'UNAUTHENTICATED'));
      }
      req.user = user;
      return next();
    })
    .catch(next);
}

export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action.', 403, 'FORBIDDEN'));
    }
    return next();
  };
}

export { COOKIE_NAME };

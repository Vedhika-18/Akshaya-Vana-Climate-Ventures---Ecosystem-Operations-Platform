import { AppError } from '../utils/AppError.js';

export function errorHandler(error, req, res, next) {
  const statusCode = error instanceof AppError ? error.statusCode : 500;
  const body = {
    error: {
      code: error instanceof AppError ? error.code : 'INTERNAL_ERROR',
      message: statusCode === 500 ? 'An unexpected error occurred.' : error.message,
    },
  };

  if (error instanceof AppError && error.details !== undefined) {
    body.error.details = error.details;
  }

  if (statusCode === 500) {
    req.log?.error?.(error);
  }

  res.status(statusCode).json(body);
}

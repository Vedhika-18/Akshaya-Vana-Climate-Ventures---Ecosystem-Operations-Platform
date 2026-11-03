import { Router } from 'express';
import { login, logout, me } from './auth.js';
import { createUser, listUsers, updateUser, userMiddleware } from './users.js';

export const apiRouter = Router();

apiRouter.post('/auth/login', login);
apiRouter.post('/auth/logout', logout);
apiRouter.get('/auth/me', me);
apiRouter.get('/users', userMiddleware, listUsers);
apiRouter.post('/users', userMiddleware, createUser);
apiRouter.put('/users/:id', userMiddleware, updateUser);

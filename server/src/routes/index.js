import { Router } from 'express';
import { login, logout, me } from './auth.js';
import { createUser, listUsers, updateUser, userMiddleware } from './users.js';
import {
  create, createGoal, createMember, detail, editGoal, lifecycle, list, remove, removeGoal, removeMember, update,
} from '../controllers/project.js';
import { authenticate } from '../middleware/auth.js';
import { createEntry, listEntries, setTotal } from '../controllers/progress.js';

export const apiRouter = Router();

apiRouter.post('/auth/login', login);
apiRouter.post('/auth/logout', logout);
apiRouter.get('/auth/me', me);
apiRouter.get('/users', userMiddleware, listUsers);
apiRouter.post('/users', userMiddleware, createUser);
apiRouter.put('/users/:id', userMiddleware, updateUser);
apiRouter.get('/projects', authenticate, list);
apiRouter.get('/projects/:id', authenticate, detail);
apiRouter.post('/projects', authenticate, create);
apiRouter.put('/projects/:id', authenticate, update);
apiRouter.delete('/projects/:id', authenticate, remove);
apiRouter.put('/projects/:id/lifecycle', authenticate, lifecycle);
apiRouter.post('/projects/:id/goals', authenticate, createGoal);
apiRouter.put('/goals/:goalId', authenticate, editGoal);
apiRouter.delete('/goals/:goalId', authenticate, removeGoal);
apiRouter.post('/goals/:goalId/entries', authenticate, createEntry);
apiRouter.post('/goals/:goalId/set-total', authenticate, setTotal);
apiRouter.get('/goals/:goalId/entries', authenticate, listEntries);
apiRouter.post('/projects/:id/members', authenticate, createMember);
apiRouter.delete('/projects/:id/members/:userId', authenticate, removeMember);

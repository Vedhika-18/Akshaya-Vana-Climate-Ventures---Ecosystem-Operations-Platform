import { asyncHandler } from '../utils/asyncHandler.js';
import {
  createProject,
  deleteProject,
  deleteGoal,
  deleteMember,
  getProject,
  listProjects,
  updateGoal,
  updateLifecycle,
  updateProject,
  addGoal,
  addMember,
} from '../services/projectService.js';

export const list = asyncHandler(async (req, res) => res.json(await listProjects(req.query)));
export const detail = asyncHandler(async (req, res) => res.json({ data: await getProject(req.params.id) }));
export const create = asyncHandler(async (req, res) => res.status(201).json({ data: await createProject(req.user, req.body) }));
export const update = asyncHandler(async (req, res) => res.json({ data: await updateProject(req.user, req.params.id, req.body) }));
export const remove = asyncHandler(async (req, res) => res.json({ data: await deleteProject(req.user, req.params.id) }));
export const lifecycle = asyncHandler(async (req, res) => res.json({ data: await updateLifecycle(req.user, req.params.id, req.body) }));
export const createGoal = asyncHandler(async (req, res) => res.status(201).json({ data: await addGoal(req.user, req.params.id, req.body) }));
export const editGoal = asyncHandler(async (req, res) => res.json({ data: await updateGoal(req.user, req.params.goalId, req.body) }));
export const removeGoal = asyncHandler(async (req, res) => res.json({ data: await deleteGoal(req.user, req.params.goalId) }));
export const createMember = asyncHandler(async (req, res) => res.status(201).json({ data: await addMember(req.user, req.params.id, req.body) }));
export const removeMember = asyncHandler(async (req, res) => res.json({ data: await deleteMember(req.user, req.params.id, req.params.userId) }));

import { asyncHandler } from '../utils/asyncHandler.js';
import {
  addProgressEntry,
  listProgressEntries,
  setGoalTotal,
} from '../services/progressEntryService.js';

export const createEntry = asyncHandler(async (req, res) => {
  const progress = await addProgressEntry(req.user, req.params.goalId, req.body);
  res.status(201).json({ data: progress });
});

export const setTotal = asyncHandler(async (req, res) => {
  const { progress } = await setGoalTotal(req.user, req.params.goalId, req.body);
  res.json({ data: progress });
});

export const listEntries = asyncHandler(async (req, res) => {
  res.json(await listProgressEntries(req.params.goalId, req.query));
});

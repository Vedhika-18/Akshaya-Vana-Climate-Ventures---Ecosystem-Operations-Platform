import { asyncHandler } from '../utils/asyncHandler.js';
import {
  getDashboard,
  getPublicImpact,
  projectActivity,
  recentActivity,
} from '../services/dashboardService.js';

export const dashboard = asyncHandler(async (req, res) => {
  res.json(await getDashboard(req.query));
});

export const recent = asyncHandler(async (req, res) => {
  res.json({ data: await recentActivity(20) });
});

export const projectRecent = asyncHandler(async (req, res) => {
  res.json(await projectActivity(req.params.id, req.query));
});

export const publicImpact = asyncHandler(async (req, res) => {
  res.json(await getPublicImpact());
});

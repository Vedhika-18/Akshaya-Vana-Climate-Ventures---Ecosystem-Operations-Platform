import { z } from 'zod';

export const dashboardQuerySchema = z.object({
  range: z.enum(['live', '1y', 'all']).default('all'),
}).strict();

export const activityListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
}).strict();

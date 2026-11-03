import { z } from 'zod';

const source = z.enum([
  'FIELD_SURVEY',
  'DRONE',
  'SATELLITE',
  'SOIL_SAMPLE',
  'COMMUNITY_REPORT',
  'MANUAL',
]);

export const progressEntrySchema = z.object({
  value: z.number().finite().positive(),
  entryDate: z.coerce.date(),
  note: z.string().trim().max(500).optional(),
  source,
}).strict();

export const setTotalSchema = z.object({
  newTotal: z.number().finite().min(0),
  note: z.string().trim().min(1).max(500),
  source: source.default('MANUAL'),
}).strict();

export const entryListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
}).strict();

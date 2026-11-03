import { z } from 'zod';

const enums = {
  status: z.enum(['PLANNED', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED']),
  category: z.enum(['AGROFORESTRY', 'CARBON_FOREST', 'BIODIVERSITY', 'WATERSHED', 'COMMUNITY_LIVELIHOODS']),
  landscape: z.enum(['WESTERN_GHATS', 'CENTRAL_INDIA', 'EASTERN_HIMALAYAS', 'OTHER']),
  carbonStandard: z.enum(['VERRA_VCS', 'GOLD_STANDARD', 'PLAN_VIVO', 'NONE']),
  lifecycleStage: z.enum(['LAND_RESTORATION', 'MONITORING', 'VERIFICATION', 'CREDIT_ISSUANCE', 'CORPORATE_OFFSET']),
  metricKey: z.enum(['TREES_PLANTED', 'HECTARES_RESTORED', 'CO2_CAPTURED', 'SPECIES_PROTECTED', 'HOUSEHOLDS_IMPACTED', 'BIODIVERSITY_SCORE', 'CUSTOM']),
  aggregation: z.enum(['SUM', 'LATEST']),
};

const sdgs = z.array(z.number().int().refine((value) => [1, 2, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 17].includes(value), 'Invalid SDG')).max(13);

const goalBase = z.object({
  metricKey: enums.metricKey,
  label: z.string().trim().min(1).max(120),
  unit: z.string().trim().min(1).max(40),
  targetValue: z.number().finite().positive(),
  aggregation: enums.aggregation.default('SUM'),
}).strict();

function fixedGoalRules(value, context) {
  const fixedUnits = {
    TREES_PLANTED: 'trees',
    HECTARES_RESTORED: 'ha',
    CO2_CAPTURED: 'tCO2e',
    SPECIES_PROTECTED: 'species',
    HOUSEHOLDS_IMPACTED: 'households',
    BIODIVERSITY_SCORE: 'score',
  };
  if (fixedUnits[value.metricKey] && value.unit !== fixedUnits[value.metricKey]) {
    context.addIssue({ code: 'custom', path: ['unit'], message: `Unit must be ${fixedUnits[value.metricKey]}.` });
  }
  if (value.metricKey === 'BIODIVERSITY_SCORE' && value.targetValue > 100) {
    context.addIssue({ code: 'custom', path: ['targetValue'], message: 'Biodiversity score target cannot exceed 100.' });
  }
}

export const goalSchema = goalBase.superRefine(fixedGoalRules);
export const goalUpdateSchema = goalBase.partial().strict().superRefine(fixedGoalRules);

const projectFields = {
  name: z.string().trim().min(3).max(120),
  description: z.string().max(2000).nullable().optional(),
  category: enums.category,
  status: enums.status,
  landscape: enums.landscape,
  locationName: z.string().trim().min(1).max(120),
  state: z.string().trim().min(1).max(120),
  latitude: z.number().finite().min(-90).max(90).nullable().optional(),
  longitude: z.number().finite().min(-180).max(180).nullable().optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  budget: z.number().finite().min(0),
  carbonStandard: enums.carbonStandard,
  lifecycleStage: enums.lifecycleStage,
  isFlagship: z.boolean().default(false),
  sdgs,
  coverImageUrl: z.string().url().nullable().optional(),
};

export const createProjectSchema = z.object({
  ...projectFields,
  goals: z.array(goalSchema).default([]),
}).strict().superRefine((value, context) => {
  if (value.endDate <= value.startDate) {
    context.addIssue({ code: 'custom', path: ['endDate'], message: 'endDate must be after startDate.' });
  }
});

export const updateProjectSchema = z.object({
  ...projectFields,
  version: z.number().int().positive(),
}).strict().partial().required({ version: true }).superRefine((value, context) => {
  if (value.startDate && value.endDate && value.endDate <= value.startDate) {
    context.addIssue({ code: 'custom', path: ['endDate'], message: 'endDate must be after startDate.' });
  }
});

export const lifecycleSchema = z.object({
  stage: enums.lifecycleStage,
  note: z.string().trim().min(1).max(2000),
}).strict();

export const memberSchema = z.object({
  userId: z.string().min(1),
}).strict();

export const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  search: z.string().trim().optional(),
  status: enums.status.optional(),
  category: enums.category.optional(),
  landscape: enums.landscape.optional(),
  lifecycleStage: enums.lifecycleStage.optional(),
  carbonStandard: enums.carbonStandard.optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'name', 'code', 'startDate', 'endDate', 'budget']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
}).strict();

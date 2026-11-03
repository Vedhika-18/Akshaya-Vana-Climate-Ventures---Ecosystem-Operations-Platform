import { prisma } from '../db/prisma.js';
import { canAddProgress, canSetTotal } from './permissions.js';
import { getGoalProgress } from './progressService.js';
import { AppError } from '../utils/AppError.js';
import {
  entryListQuerySchema,
  progressEntrySchema,
  setTotalSchema,
} from '../validators/progress.js';

function validationError(error) {
  return new AppError('Validation failed.', 400, 'VALIDATION_ERROR', error.issues);
}

function requireValid(schema, value) {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw validationError(parsed.error);
  return parsed.data;
}

function requireGoal(goal) {
  if (!goal || goal.project.archivedAt) {
    throw new AppError('Goal not found.', 404, 'NOT_FOUND');
  }
  return goal;
}

function requireEntryDate(entryDate) {
  if (entryDate > new Date()) {
    throw new AppError('entryDate cannot be in the future.', 400, 'VALIDATION_ERROR');
  }
}

function requireProgressPermission(user, project, setTotal = false) {
  const permitted = setTotal ? canSetTotal(user, project) : canAddProgress(user, project);
  if (!permitted) {
    throw new AppError('You do not have permission to modify progress for this project.', 403, 'FORBIDDEN');
  }
}

async function findGoal(tx, goalId) {
  return requireGoal(await tx.projectGoal.findUnique({
    where: { id: goalId },
    include: { project: { select: { id: true, archivedAt: true, managerId: true, members: { select: { userId: true } } } } },
  }));
}

async function currentProgress(tx, goal) {
  const refreshed = await tx.projectGoal.findUnique({
    where: { id: goal.id },
    include: { entries: { select: { value: true, entryDate: true }, orderBy: { entryDate: 'desc' } } },
  });
  return getGoalProgress(refreshed);
}

export async function addProgressEntry(user, goalId, input) {
  const data = requireValid(progressEntrySchema, input);
  requireEntryDate(data.entryDate);

  return prisma.$transaction(async (tx) => {
    const goal = await findGoal(tx, goalId);
    requireProgressPermission(user, goal.project);
    if ((goal.metricKey === 'BIODIVERSITY_SCORE' || goal.aggregation === 'LATEST')
      && (data.value < 0 || data.value > 100)) {
      throw new AppError('Value must be between 0 and 100 for this goal.', 400, 'VALIDATION_ERROR');
    }

    const entry = await tx.progressEntry.create({
      data: {
        goalId,
        value: data.value,
        entryDate: data.entryDate,
        note: data.note,
        source: data.source,
        type: 'PROGRESS',
        createdById: user.id,
      },
    });
    const progress = await currentProgress(tx, goal);
    await tx.activityLog.create({
      data: {
        entity: 'ProgressEntry',
        entityId: entry.id,
        projectId: goal.projectId,
        action: 'PROGRESS_ENTRY_CREATED',
        before: null,
        after: { value: data.value, entryDate: data.entryDate.toISOString(), note: data.note ?? null, source: data.source },
        userId: user.id,
      },
    });
    return progress;
  });
}

export async function setGoalTotal(user, goalId, input) {
  const data = requireValid(setTotalSchema, input);

  return prisma.$transaction(async (tx) => {
    const goal = await findGoal(tx, goalId);
    requireProgressPermission(user, goal.project, true);
    if (goal.aggregation === 'LATEST') {
      throw new AppError('set-total is only available for SUM goals.', 400, 'INVALID_AGGREGATION');
    }

    const aggregate = await tx.progressEntry.aggregate({
      where: { goalId },
      _sum: { value: true },
    });
    const total = aggregate._sum.value ?? 0;
    if (data.newTotal === total) {
      throw new AppError('newTotal must differ from the current total.', 400, 'NO_CHANGE');
    }

    const difference = data.newTotal - total;
    const entry = await tx.progressEntry.create({
      data: {
        goalId,
        value: difference,
        entryDate: new Date(),
        note: data.note,
        source: data.source,
        type: 'CORRECTION',
        createdById: user.id,
      },
    });
    const progress = await currentProgress(tx, goal);
    await tx.activityLog.create({
      data: {
        entity: 'ProjectGoal',
        entityId: goalId,
        projectId: goal.projectId,
        action: 'GOAL_TOTAL_CORRECTED',
        before: { total },
        after: { total: data.newTotal },
        userId: user.id,
      },
    });
    return { progress, entry };
  });
}

export async function listProgressEntries(goalId, query) {
  const filters = requireValid(entryListQuerySchema, query);
  const goal = requireGoal(await prisma.projectGoal.findUnique({
    where: { id: goalId },
    include: { project: { select: { archivedAt: true } } },
  }));
  const where = { goalId };
  const [total, entries] = await prisma.$transaction([
    prisma.progressEntry.count({ where }),
    prisma.progressEntry.findMany({
      where,
      orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }],
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit,
      select: {
        id: true, value: true, entryDate: true, note: true, type: true, source: true,
        createdBy: { select: { id: true, name: true } },
      },
    }),
  ]);
  return {
    data: entries,
    meta: { page: filters.page, limit: filters.limit, total },
  };
}

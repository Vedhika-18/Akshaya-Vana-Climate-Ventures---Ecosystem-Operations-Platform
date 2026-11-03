import { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma.js';
import { canEditProject } from './permissions.js';
import { getProjectProgressSummary } from './progressService.js';
import {
  createProjectSchema,
  goalSchema,
  goalUpdateSchema,
  lifecycleSchema,
  listQuerySchema,
  memberSchema,
  updateProjectSchema,
} from '../validators/project.js';
import { AppError } from '../utils/AppError.js';

const projectInclude = {
  manager: { select: { id: true, name: true, email: true, role: true, isActive: true } },
  members: {
    include: {
      user: { select: { id: true, name: true, email: true, role: true, isActive: true } },
    },
  },
  goals: {
    include: {
      entries: {
        select: { id: true, value: true, entryDate: true, note: true, type: true, source: true },
        orderBy: { entryDate: 'desc' },
      },
    },
  },
};

function validationError(error) {
  return new AppError('Validation failed.', 400, 'VALIDATION_ERROR', error.issues);
}

function requireValid(schema, value) {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw validationError(parsed.error);
  return parsed.data;
}

function requireProject(project) {
  if (!project || project.archivedAt) throw new AppError('Project not found.', 404, 'NOT_FOUND');
  return project;
}

function requireEditPermission(user, project) {
  if (!canEditProject(user, project)) {
    throw new AppError('You do not have permission to modify this project.', 403, 'FORBIDDEN');
  }
}

function projectSnapshot(project) {
  return {
    id: project.id,
    code: project.code,
    name: project.name,
    description: project.description,
    category: project.category,
    status: project.status,
    landscape: project.landscape,
    locationName: project.locationName,
    state: project.state,
    latitude: project.latitude,
    longitude: project.longitude,
    startDate: project.startDate?.toISOString?.() ?? project.startDate,
    endDate: project.endDate?.toISOString?.() ?? project.endDate,
    budget: project.budget?.toString?.() ?? project.budget,
    carbonStandard: project.carbonStandard,
    lifecycleStage: project.lifecycleStage,
    isFlagship: project.isFlagship,
    sdgs: project.sdgs,
    coverImageUrl: project.coverImageUrl,
    managerId: project.managerId,
    archivedAt: project.archivedAt?.toISOString?.() ?? project.archivedAt,
    version: project.version,
  };
}

function goalSnapshot(goal) {
  return {
    id: goal.id,
    projectId: goal.projectId,
    metricKey: goal.metricKey,
    label: goal.label,
    unit: goal.unit,
    targetValue: goal.targetValue,
    aggregation: goal.aggregation,
  };
}

function memberSnapshot(member) {
  return { projectId: member.projectId, userId: member.userId };
}

function projectResponse(project) {
  const progress = getProjectProgressSummary(project);
  return {
    ...project,
    budget: project.budget?.toString?.() ?? project.budget,
    progress,
  };
}

function projectData(data, managerId) {
  return {
    ...data,
    managerId,
    budget: new Prisma.Decimal(data.budget),
    startDate: data.startDate,
    endDate: data.endDate,
  };
}

async function nextProjectCode(tx, year) {
  const projects = await tx.project.findMany({
    where: { code: { startsWith: `AV-${year}-` } },
    select: { code: true },
    orderBy: { code: 'desc' },
  });
  const highest = projects.reduce((max, project) => {
    const sequence = Number(project.code.slice(-3));
    return Number.isInteger(sequence) ? Math.max(max, sequence) : max;
  }, 0);
  return `AV-${year}-${String(highest + 1).padStart(3, '0')}`;
}

export async function listProjects(query) {
  const filters = requireValid(listQuerySchema, query);
  const where = {
    archivedAt: null,
    ...(filters.status && { status: filters.status }),
    ...(filters.category && { category: filters.category }),
    ...(filters.landscape && { landscape: filters.landscape }),
    ...(filters.lifecycleStage && { lifecycleStage: filters.lifecycleStage }),
    ...(filters.carbonStandard && { carbonStandard: filters.carbonStandard }),
    ...(filters.search && {
      OR: [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { code: { contains: filters.search, mode: 'insensitive' } },
        { locationName: { contains: filters.search, mode: 'insensitive' } },
      ],
    }),
  };
  const [total, projects] = await prisma.$transaction([
    prisma.project.count({ where }),
    prisma.project.findMany({
      where,
      include: projectInclude,
      orderBy: { [filters.sortBy]: filters.sortOrder },
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit,
    }),
  ]);
  return {
    data: projects.map(projectResponse),
    meta: { page: filters.page, limit: filters.limit, total },
  };
}

export async function getProject(id) {
  const project = requireProject(await prisma.project.findUnique({
    where: { id },
    include: projectInclude,
  }));
  return projectResponse(project);
}

export async function createProject(user, input) {
  if (!['ADMIN', 'MANAGER'].includes(user.role)) {
    throw new AppError('You do not have permission to create projects.', 403, 'FORBIDDEN');
  }
  const data = requireValid(createProjectSchema, input);
  return prisma.$transaction(async (tx) => {
    const managerId = user.role === 'MANAGER' ? user.id : null;
    const code = await nextProjectCode(tx, data.startDate.getUTCFullYear());
    const project = await tx.project.create({
      data: {
        ...projectData(data, managerId),
        code,
        goals: { create: data.goals },
      },
      include: projectInclude,
    });
    await tx.activityLog.create({
      data: {
        entity: 'Project',
        entityId: project.id,
        projectId: project.id,
        action: 'PROJECT_CREATED',
        before: null,
        after: projectSnapshot(project),
        userId: user.id,
      },
    });
    for (const goal of project.goals) {
      await tx.activityLog.create({
        data: {
          entity: 'ProjectGoal',
          entityId: goal.id,
          projectId: project.id,
          action: 'GOAL_CREATED',
          before: null,
          after: goalSnapshot(goal),
          userId: user.id,
        },
      });
    }
    return projectResponse(project);
  });
}

export async function updateProject(user, id, input) {
  const data = requireValid(updateProjectSchema, input);
  return prisma.$transaction(async (tx) => {
    const current = requireProject(await tx.project.findUnique({ where: { id } }));
    requireEditPermission(user, current);
    if (data.startDate && data.endDate && data.endDate <= data.startDate) {
      throw new AppError('Validation failed.', 400, 'VALIDATION_ERROR', [{ path: ['endDate'], message: 'endDate must be after startDate.' }]);
    }

    const { version, ...updates } = data;
    const updateData = {
      ...updates,
      ...(updates.budget !== undefined && { budget: new Prisma.Decimal(updates.budget) }),
    };
    const result = await tx.project.updateMany({
      where: { id, version, archivedAt: null },
      data: { ...updateData, version: { increment: 1 } },
    });
    if (result.count !== 1) {
      throw new AppError('This project was modified by someone else, please reload.', 409, 'VERSION_CONFLICT');
    }
    const updated = await tx.project.findUnique({ where: { id }, include: projectInclude });
    await tx.activityLog.create({
      data: {
        entity: 'Project',
        entityId: id,
        projectId: id,
        action: 'PROJECT_UPDATED',
        before: projectSnapshot(current),
        after: projectSnapshot(updated),
        userId: user.id,
      },
    });
    return projectResponse(updated);
  });
}

export async function deleteProject(user, id) {
  return prisma.$transaction(async (tx) => {
    const current = requireProject(await tx.project.findUnique({ where: { id } }));
    requireEditPermission(user, current);
    const updated = await tx.project.update({
      where: { id, archivedAt: null },
      data: { archivedAt: new Date(), version: { increment: 1 } },
    });
    await tx.activityLog.create({
      data: {
        entity: 'Project',
        entityId: id,
        projectId: id,
        action: 'PROJECT_ARCHIVED',
        before: projectSnapshot(current),
        after: projectSnapshot(updated),
        userId: user.id,
      },
    });
    return projectSnapshot(updated);
  });
}

export async function updateLifecycle(user, id, input) {
  const data = requireValid(lifecycleSchema, input);
  return prisma.$transaction(async (tx) => {
    const current = requireProject(await tx.project.findUnique({ where: { id } }));
    requireEditPermission(user, current);
    const updated = await tx.project.update({
      where: { id },
      data: { lifecycleStage: data.stage, version: { increment: 1 } },
    });
    await tx.activityLog.create({
      data: {
        entity: 'Project',
        entityId: id,
        projectId: id,
        action: 'LIFECYCLE_CHANGED',
        before: { ...projectSnapshot(current), note: null },
        after: { ...projectSnapshot(updated), note: data.note },
        userId: user.id,
      },
    });
    return projectSnapshot(updated);
  });
}

async function projectForEdit(tx, user, id) {
  const project = requireProject(await tx.project.findUnique({ where: { id } }));
  requireEditPermission(user, project);
  return project;
}

export async function addGoal(user, projectId, input) {
  const data = requireValid(goalSchema, input);
  return prisma.$transaction(async (tx) => {
    const project = await projectForEdit(tx, user, projectId);
    const goal = await tx.projectGoal.create({ data: { ...data, projectId } });
    await tx.activityLog.create({
      data: {
        entity: 'ProjectGoal',
        entityId: goal.id,
        projectId,
        action: 'GOAL_CREATED',
        before: null,
        after: goalSnapshot(goal),
        userId: user.id,
      },
    });
    return goal;
  });
}

export async function updateGoal(user, goalId, input) {
  const data = requireValid(goalUpdateSchema, input);
  return prisma.$transaction(async (tx) => {
    const current = await tx.projectGoal.findUnique({ where: { id: goalId } });
    if (!current) throw new AppError('Goal not found.', 404, 'NOT_FOUND');
    const project = await projectForEdit(tx, user, current.projectId);
    const merged = requireValid(goalSchema, {
      metricKey: current.metricKey,
      label: current.label,
      unit: current.unit,
      targetValue: current.targetValue,
      aggregation: current.aggregation,
      ...data,
    });
    const updated = await tx.projectGoal.update({ where: { id: goalId }, data: merged });
    await tx.activityLog.create({
      data: {
        entity: 'ProjectGoal',
        entityId: goalId,
        projectId: project.id,
        action: 'GOAL_UPDATED',
        before: goalSnapshot(current),
        after: goalSnapshot(updated),
        userId: user.id,
      },
    });
    return updated;
  });
}

export async function deleteGoal(user, goalId) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.projectGoal.findUnique({ where: { id: goalId }, include: { entries: { select: { id: true } } } });
    if (!current) throw new AppError('Goal not found.', 404, 'NOT_FOUND');
    const project = await projectForEdit(tx, user, current.projectId);
    if (current.entries.length) {
      throw new AppError('Cannot delete a goal that already has progress entries.', 409, 'GOAL_HAS_PROGRESS');
    }
    await tx.projectGoal.delete({ where: { id: goalId } });
    await tx.activityLog.create({
      data: {
        entity: 'ProjectGoal',
        entityId: goalId,
        projectId: project.id,
        action: 'GOAL_DELETED',
        before: goalSnapshot(current),
        after: null,
        userId: user.id,
      },
    });
    return goalSnapshot(current);
  });
}

export async function addMember(user, projectId, input) {
  const data = requireValid(memberSchema, input);
  return prisma.$transaction(async (tx) => {
    const project = await projectForEdit(tx, user, projectId);
    const memberUser = await tx.user.findUnique({ where: { id: data.userId } });
    if (!memberUser) throw new AppError('User not found.', 404, 'NOT_FOUND');
    if (memberUser.role !== 'FIELD_OFFICER') {
      throw new AppError('Only field officers can be assigned to projects.', 400, 'INVALID_MEMBER_ROLE');
    }
    try {
      const member = await tx.projectMember.create({ data: { projectId, userId: data.userId } });
      await tx.activityLog.create({
        data: {
          entity: 'ProjectMember',
          entityId: `${projectId}:${data.userId}`,
          projectId,
          action: 'MEMBER_ADDED',
          before: null,
          after: memberSnapshot(member),
          userId: user.id,
        },
      });
      return member;
    } catch (error) {
      if (error?.code === 'P2002') throw new AppError('User is already a project member.', 409, 'DUPLICATE_MEMBER');
      throw error;
    }
  });
}

export async function deleteMember(user, projectId, userId) {
  return prisma.$transaction(async (tx) => {
    const project = await projectForEdit(tx, user, projectId);
    const current = await tx.projectMember.findUnique({ where: { projectId_userId: { projectId, userId } } });
    if (!current) throw new AppError('Project member not found.', 404, 'NOT_FOUND');
    await tx.projectMember.delete({ where: { projectId_userId: { projectId, userId } } });
    await tx.activityLog.create({
      data: {
        entity: 'ProjectMember',
        entityId: `${projectId}:${userId}`,
        projectId,
        action: 'MEMBER_REMOVED',
        before: memberSnapshot(current),
        after: null,
        userId: user.id,
      },
    });
    return memberSnapshot(current);
  });
}

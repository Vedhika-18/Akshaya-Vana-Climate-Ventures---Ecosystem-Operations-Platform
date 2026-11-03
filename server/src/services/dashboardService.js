import { prisma } from '../db/prisma.js';
import { getProjectProgress, getScheduleHealth } from './progressService.js';
import { AppError } from '../utils/AppError.js';
import { activityListQuerySchema, dashboardQuerySchema } from '../validators/dashboard.js';

const headlineMetrics = [
  ['CO2_CAPTURED', 'CO2 captured', 'tCO2e'],
  ['HECTARES_RESTORED', 'Hectares restored', 'ha'],
  ['TREES_PLANTED', 'Trees planted', 'trees'],
  ['BIODIVERSITY_SCORE', 'Biodiversity score', 'score /100'],
  ['HOUSEHOLDS_IMPACTED', 'Households impacted', 'households'],
];
const lifecycleStages = ['LAND_RESTORATION', 'MONITORING', 'VERIFICATION', 'CREDIT_ISSUANCE', 'CORPORATE_OFFSET'];
const landscapes = ['WESTERN_GHATS', 'CENTRAL_INDIA', 'EASTERN_HIMALAYAS', 'OTHER'];
const standards = ['VERRA_VCS', 'GOLD_STANDARD', 'PLAN_VIVO', 'NONE'];
const statuses = ['PLANNED', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'];

function rangeStart(range, now = new Date()) {
  if (range === 'live') return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  if (range === '1y') return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  return null;
}

function monthKey(date) {
  return date.toISOString().slice(0, 7);
}

function monthKeys(now = new Date()) {
  const keys = [];
  for (let offset = 11; offset >= 0; offset -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
    keys.push(monthKey(date));
  }
  return keys;
}

function percentage(achieved, target) {
  return target > 0 ? (achieved / target) * 100 : 0;
}

function expectedProgress(project, now = new Date()) {
  if (project.status === 'COMPLETED') return 100;
  const start = new Date(project.startDate);
  const end = new Date(project.endDate);
  if (now < start) return 0;
  if (now > end) return 100;
  const duration = end.getTime() - start.getTime();
  return duration > 0 ? ((now.getTime() - start.getTime()) / duration) * 100 : 100;
}

function goalCurrent(goal) {
  return getProjectProgress({ goals: [goal] }).goals[0]?.current ?? 0;
}

async function dashboardData(range = 'all', includeActivity = true) {
  const now = new Date();
  const start = rangeStart(range, now);
  const projects = await prisma.project.findMany({
    where: { archivedAt: null },
    include: {
      goals: {
        include: {
          entries: {
            orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }],
            select: { value: true, entryDate: true, createdAt: true },
          },
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  const allGoals = projects.flatMap((project) => project.goals.map((goal) => ({ ...goal, project })));
  const projectProgress = projects.map((project) => ({
    project,
    progress: getProjectProgress(project),
    latestEntry: project.goals.flatMap((goal) => goal.entries)
      .sort((a, b) => new Date(b.entryDate) - new Date(a.entryDate))[0],
  }));
  const impact = headlineMetrics.map(([metricKey, defaultLabel, defaultUnit]) => {
    const goals = allGoals.filter((goal) => goal.metricKey === metricKey);
    let achieved;
    let target;
    if (metricKey === 'BIODIVERSITY_SCORE') {
      const latestReadings = goals.map((goal) => goal.entries[0]?.value).filter((value) => value !== undefined);
      achieved = latestReadings.length
        ? latestReadings.reduce((sum, value) => sum + value, 0) / latestReadings.length
        : null;
      target = 100;
    } else {
      achieved = goals.reduce((sum, goal) => sum + goalCurrent(goal), 0);
      target = goals.reduce((sum, goal) => sum + goal.targetValue, 0);
    }
    const addedInRange = metricKey === 'BIODIVERSITY_SCORE'
      ? 0
      : goals.reduce((sum, goal) => sum + goal.entries
        .filter((entry) => !start || new Date(entry.entryDate) >= start)
        .reduce((entrySum, entry) => entrySum + entry.value, 0), 0);
    return {
      metricKey,
      label: goals[0]?.label ?? defaultLabel,
      unit: goals[0]?.unit ?? defaultUnit,
      achieved,
      target,
      progressPct: percentage(achieved, target),
      addedInRange,
    };
  });

  const projectProgressValues = projectProgress.map(({ project, progress, latestEntry }) => ({
    project,
    progress,
    latestEntry,
    expected: expectedProgress(project, now),
    health: getScheduleHealth(project, progress),
  }));
  const overallProgress = projectProgressValues.length
    ? projectProgressValues.reduce((sum, item) => sum + Math.min(item.progress.percentage, 100), 0) / projectProgressValues.length
    : 0;

  const monthlyKeys = monthKeys(now);
  const monthlyProgress = Object.fromEntries(headlineMetrics.map(([metricKey]) => {
    const entries = metricKey === 'BIODIVERSITY_SCORE' ? [] : allGoals
        .filter((goal) => goal.metricKey === metricKey)
        .flatMap((goal) => goal.entries)
        .sort((a, b) => new Date(a.entryDate) - new Date(b.entryDate));
    const firstMonth = `${monthlyKeys[0]}-01T00:00:00.000Z`;
    let cumulative = entries
      .filter((entry) => new Date(entry.entryDate) < new Date(firstMonth))
      .reduce((sum, entry) => sum + entry.value, 0);
    return [metricKey, monthlyKeys.map((month) => {
      const added = entries
        .filter((entry) => monthKey(new Date(entry.entryDate)) === month)
        .reduce((sum, entry) => sum + entry.value, 0);
      cumulative += added;
      return { month, added, cumulative };
    })];
  }));

  const landscapeBreakdown = landscapes.map((landscape) => {
    const matchingProjects = projects.filter((project) => project.landscape === landscape);
    const goals = matchingProjects.flatMap((project) => project.goals);
    return {
      landscape,
      projects: matchingProjects.length,
      hectares: goals.filter((goal) => goal.metricKey === 'HECTARES_RESTORED').reduce((sum, goal) => sum + goalCurrent(goal), 0),
      trees: goals.filter((goal) => goal.metricKey === 'TREES_PLANTED').reduce((sum, goal) => sum + goalCurrent(goal), 0),
      co2: goals.filter((goal) => goal.metricKey === 'CO2_CAPTURED').reduce((sum, goal) => sum + goalCurrent(goal), 0),
    };
  });

  return {
    impact,
    portfolio: {
      totalProjects: projects.length,
      activeProjects: projects.filter((project) => project.status === 'ACTIVE').length,
      completedProjects: projects.filter((project) => project.status === 'COMPLETED').length,
      atRiskProjects: projectProgressValues.filter(({ health }) => health === 'AT_RISK' || health === 'OVERDUE').length,
      overallProgress,
      totalBudget: projects.reduce((sum, project) => sum + Number(project.budget), 0),
    },
    lifecyclePipeline: lifecycleStages.map((stage) => ({ stage, count: projects.filter((project) => project.lifecycleStage === stage).length })),
    landscapeBreakdown,
    standardBreakdown: standards.map((standard) => ({ standard, count: projects.filter((project) => project.carbonStandard === standard).length })),
    statusBreakdown: statuses.map((status) => ({ status, count: projects.filter((project) => project.status === status).length })),
    sdgCoverage: [...new Set(projects.flatMap((project) => project.sdgs))].sort((a, b) => a - b)
      .map((sdg) => ({ sdg, projects: projects.filter((project) => project.sdgs.includes(sdg)).length })),
    projectProgress: projectProgressValues
      .filter(({ latestEntry }) => latestEntry)
      .sort((a, b) => new Date(b.latestEntry.entryDate) - new Date(a.latestEntry.entryDate))
      .slice(0, 10)
      .map(({ project, progress }) => ({ id: project.id, name: project.name, progress })),
    monthlyProgress,
    atRiskList: projectProgressValues
      .filter(({ health }) => health === 'AT_RISK' || health === 'OVERDUE')
      .sort((a, b) => (b.expected - b.progress.percentage) - (a.expected - a.progress.percentage))
      .map(({ project, expected, progress, health }) => ({
        id: project.id, name: project.name, expected, actual: progress.percentage, health,
      })),
    mapPoints: projects.filter((project) => project.latitude !== null && project.longitude !== null)
      .map((project) => {
        const progress = getProjectProgress(project);
        return {
          id: project.id, name: project.name, lat: project.latitude, lng: project.longitude,
          progress: progress.percentage, status: project.status, landscape: project.landscape,
        };
      }),
    recentActivity: includeActivity ? await recentActivity(10) : [],
  };
}

export async function getDashboard(query) {
  const parsed = dashboardQuerySchema.safeParse(query);
  if (!parsed.success) throw new AppError('Validation failed.', 400, 'VALIDATION_ERROR', parsed.error.issues);
  return dashboardData(parsed.data.range);
}

let publicCache = { expires: 0, value: null };
export async function getPublicImpact() {
  if (publicCache.value && publicCache.expires > Date.now()) return publicCache.value;
  const dashboard = await dashboardData('all', false);
  const impactByMetric = Object.fromEntries(dashboard.impact.map((metric) => [metric.metricKey, metric.achieved]));
  const value = {
    trees: impactByMetric.TREES_PLANTED ?? 0,
    hectares: impactByMetric.HECTARES_RESTORED ?? 0,
    co2: impactByMetric.CO2_CAPTURED ?? 0,
    households: impactByMetric.HOUSEHOLDS_IMPACTED ?? 0,
    biodiversityScore: impactByMetric.BIODIVERSITY_SCORE ?? 0,
    projects: dashboard.portfolio.totalProjects,
    updatedAt: new Date().toISOString(),
  };
  publicCache = { value, expires: Date.now() + 60_000 };
  return value;
}

export async function recentActivity(limit = 20) {
  const rows = await prisma.activityLog.findMany({
    where: { project: { archivedAt: null } },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true, action: true, entity: true, createdAt: true,
      user: { select: { name: true } },
      project: { select: { name: true } },
    },
  });
  return rows.map(({ user, project, ...activity }) => ({
    ...activity,
    userName: user.name,
    projectName: project?.name ?? null,
  }));
}

export async function projectActivity(projectId, query) {
  const parsed = activityListQuerySchema.safeParse(query);
  if (!parsed.success) throw new AppError('Validation failed.', 400, 'VALIDATION_ERROR', parsed.error.issues);
  const { page, limit } = parsed.data;
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true, archivedAt: true } });
  if (!project || project.archivedAt) throw new AppError('Project not found.', 404, 'NOT_FOUND');
  const where = { projectId };
  const [total, data] = await prisma.$transaction([
    prisma.activityLog.count({ where }),
    prisma.activityLog.findMany({
      where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit,
      select: {
        id: true, action: true, entity: true, entityId: true, before: true, after: true, createdAt: true,
        user: { select: { name: true } },
        project: { select: { name: true } },
      },
    }),
  ]);
  return {
    data: data.map(({ user, project, ...activity }) => ({
      ...activity,
      userName: user.name,
      projectName: project?.name ?? null,
    })),
    meta: { page, limit, total },
  };
}

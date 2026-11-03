import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app } from '../src/app.js';
import { prisma } from '../src/db/prisma.js';
import { env } from '../src/config/env.js';
import { COOKIE_NAME } from '../src/middleware/auth.js';

const password = 'Test-only-password-123!';
const users = {};
const cookies = new Map();
let project;
let goal;

async function login(email) {
  if (cookies.has(email)) return cookies.get(email);
  const response = await request(app)
    .post('/api/auth/login')
    .send({ email, password });
  expect(response.status).toBe(200);
  const cookie = response.headers['set-cookie'][0];
  cookies.set(email, cookie);
  return cookie;
}

function authRequest(method, path, cookie) {
  return request(app)[method](path).set('Cookie', cookie);
}

function cookieFor(user) {
  return `${COOKIE_NAME}=${jwt.sign({}, env.JWT_SECRET, { subject: user.id })}`;
}

beforeAll(async () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const passwordHash = await bcrypt.hash(password, 4);
  const definitions = [
    ['manager', 'Temp Manager', 'MANAGER'],
    ['otherManager', 'Other Manager', 'MANAGER'],
    ['field', 'Assigned Field Officer', 'FIELD_OFFICER'],
    ['unassignedField', 'Unassigned Field Officer', 'FIELD_OFFICER'],
    ['viewer', 'Temp Viewer', 'VIEWER'],
  ];
  for (const [key, name, role] of definitions) {
    users[key] = await prisma.user.create({
      data: { name, email: `${key}-${suffix}@test.invalid`, role, passwordHash },
    });
  }
  project = await prisma.project.create({
    data: {
      code: `TEST-${suffix}`,
      name: 'Temporary Phase 4 Test Project',
      category: 'WATERSHED',
      status: 'ACTIVE',
      landscape: 'OTHER',
      locationName: 'Test Location',
      state: 'Karnataka',
      startDate: new Date('2025-01-01T00:00:00.000Z'),
      endDate: new Date('2028-01-01T00:00:00.000Z'),
      budget: 1000,
      carbonStandard: 'NONE',
      lifecycleStage: 'MONITORING',
      sdgs: [6],
      managerId: users.manager.id,
      members: { create: { userId: users.field.id } },
    },
  });
  goal = await prisma.projectGoal.create({
    data: {
      projectId: project.id,
      metricKey: 'TREES_PLANTED',
      label: 'Trees planted',
      unit: 'trees',
      targetValue: 1000,
      aggregation: 'SUM',
    },
  });
});

afterAll(async () => {
  const hebbal = await prisma.project.findUnique({
    where: { code: 'AV-2023-004' },
    include: { goals: { include: { entries: true } } },
  });
  const hebbalProgress = {
    target: hebbal?.goals[0]?.targetValue,
    current: hebbal?.goals[0]?.entries.reduce((sum, entry) => sum + entry.value, 0),
  };
  try {
    expect(hebbalProgress.target).toBe(1000);
    expect(hebbalProgress.current).toBe(600);
  } finally {
    await prisma.activityLog.deleteMany({ where: { projectId: project.id } });
    await prisma.project.delete({ where: { id: project.id } });
    await prisma.user.deleteMany({ where: { id: { in: Object.values(users).map((user) => user.id) } } });
    await prisma.$disconnect();
  }
});

describe('Phase 4 progress entries', () => {
  it('supports 600 -> 850 corrections and logs the change', async () => {
    const cookie = await login(users.manager.email);
    for (const value of [200, 400]) {
      const response = await authRequest('post', `/api/goals/${goal.id}/entries`, cookie)
        .send({ value, entryDate: '2026-01-01', source: 'FIELD_SURVEY' });
      expect(response.status).toBe(201);
    }

    const correction = await authRequest('post', `/api/goals/${goal.id}/set-total`, cookie)
      .send({ newTotal: 850, note: 'Reconciled field count', source: 'MANUAL' });
    expect(correction.status).toBe(200);
    expect(correction.body.data).toMatchObject({ current: 850, percentage: 85, exceeded: false });

    const entries = await prisma.progressEntry.findMany({ where: { goalId: goal.id } });
    expect(entries.reduce((sum, entry) => sum + entry.value, 0)).toBe(850);
    expect(entries.filter((entry) => entry.type === 'CORRECTION')[0].value).toBe(250);
    const log = await prisma.activityLog.findFirst({
      where: { entity: 'ProjectGoal', entityId: goal.id, action: 'GOAL_TOTAL_CORRECTED' },
    });
    expect(log.before).toEqual({ total: 600 });
    expect(log.after).toEqual({ total: 850 });
  });

  it('recalculates percentage when the target changes', async () => {
    const cookie = await login(users.manager.email);
    const response = await authRequest('put', `/api/goals/${goal.id}`, cookie)
      .send({ targetValue: 1200 });
    expect(response.status).toBe(200);
    const entries = await authRequest('get', `/api/goals/${goal.id}/entries`, cookie);
    expect(entries.status).toBe(200);
    expect(entries.body.data.length).toBeGreaterThan(0);
    const current = entries.body.data.reduce((sum, entry) => sum + entry.value, 0);
    expect(current).toBe(850);
    expect((current / response.body.data.targetValue) * 100).toBeCloseTo(70.8333, 3);
    const log = await prisma.activityLog.findFirst({
      where: { entity: 'ProjectGoal', entityId: goal.id, action: 'GOAL_UPDATED' },
      orderBy: { createdAt: 'desc' },
    });
    expect(log.before.targetValue).toBe(1000);
    expect(log.after.targetValue).toBe(1200);
  });

  it.each([
    [-1, '2026-01-01', { source: 'MANUAL' }],
    [0, '2026-01-01', { source: 'MANUAL' }],
    ['not-a-number', '2026-01-01', { source: 'MANUAL' }],
    [1, '2999-01-01', { source: 'MANUAL' }],
  ])('rejects invalid entry value/date: %s', async (value, entryDate, extra) => {
    const cookie = await login(users.manager.email);
    const response = await authRequest('post', `/api/goals/${goal.id}/entries`, cookie)
      .send({ value, entryDate, ...extra });
    expect(response.status).toBe(400);
  });

  it('rejects set-total without a note and allows exceeded targets', async () => {
    const cookie = await login(users.manager.email);
    const missingNote = await authRequest('post', `/api/goals/${goal.id}/set-total`, cookie)
      .send({ newTotal: 900 });
    expect(missingNote.status).toBe(400);

    const exceeded = await authRequest('post', `/api/goals/${goal.id}/set-total`, cookie)
      .send({ newTotal: 1300, note: 'Verified over target total' });
    expect(exceeded.status).toBe(200);
    expect(exceeded.body.data).toMatchObject({ current: 1300, percentage: expect.closeTo(108.3333, 3), exceeded: true });
  });

  it.each([
    ['viewer', 'post', { value: 1, entryDate: '2026-01-01', source: 'MANUAL' }],
    ['unassignedField', 'post', { value: 1, entryDate: '2026-01-01', source: 'MANUAL' }],
    ['otherManager', 'post', { value: 1, entryDate: '2026-01-01', source: 'MANUAL' }],
  ])('%s cannot add entries', async (userKey, method, body) => {
    const cookie = cookieFor(users[userKey]);
    const response = await authRequest(method, `/api/goals/${goal.id}/entries`, cookie).send(body);
    expect(response.status).toBe(403);
  });

  it('prevents field officers from setting totals', async () => {
    const cookie = cookieFor(users.field);
    const response = await authRequest('post', `/api/goals/${goal.id}/set-total`, cookie)
      .send({ newTotal: 1400, note: 'Not permitted' });
    expect(response.status).toBe(403);
  });
});

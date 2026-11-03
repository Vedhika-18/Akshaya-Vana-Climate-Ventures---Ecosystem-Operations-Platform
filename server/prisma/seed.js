import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const password = 'Password@123';

const date = (value) => new Date(`${value}T12:00:00.000Z`);

const users = [
  { key: 'admin', name: 'Asha Rao', email: 'admin@akshayavana.demo', role: 'ADMIN' },
  { key: 'manager1', name: 'Meera Nair', email: 'manager@akshayavana.demo', role: 'MANAGER' },
  { key: 'manager2', name: 'Arjun Menon', email: 'manager2@akshayavana.demo', role: 'MANAGER' },
  { key: 'field', name: 'Kiran Das', email: 'field@akshayavana.demo', role: 'FIELD_OFFICER' },
  { key: 'viewer', name: 'Priya Shah', email: 'investor@akshayavana.demo', role: 'VIEWER' },
];

const projects = [
  {
    code: 'AV-2023-001', name: 'Western Ghats Regeneration', category: 'AGROFORESTRY',
    status: 'ACTIVE', landscape: 'WESTERN_GHATS', locationName: 'Kodagu', state: 'Karnataka',
    standard: 'PLAN_VIVO', lifecycleStage: 'MONITORING', manager: 'manager1',
    start: '2024-01-15', end: '2027-12-31', budget: 18500000, metric: 'TREES_PLANTED',
    label: 'Trees planted', unit: 'trees', target: 12000, values: [700, 900, 1100, 1300, 1500, 1700, 1900],
    sdgs: [1, 2, 5, 6, 13, 15], flagship: true,
  },
  {
    code: 'AV-2023-002', name: 'Central India Carbon Forest', category: 'CARBON_FOREST',
    status: 'ACTIVE', landscape: 'CENTRAL_INDIA', locationName: 'Seoni', state: 'Madhya Pradesh',
    standard: 'VERRA_VCS', lifecycleStage: 'VERIFICATION', manager: 'manager1',
    start: '2023-06-01', end: '2026-06-01', budget: 32000000, metric: 'CO2_CAPTURED',
    label: 'CO2 captured', unit: 'tCO2e', target: 8500, values: [800, 900, 1000, 1100, 1200, 1300, 1400],
    sdgs: [8, 12, 13, 15],
  },
  {
    code: 'AV-2023-003', name: 'Eastern Himalayas Biodiversity', category: 'BIODIVERSITY',
    status: 'ACTIVE', landscape: 'EASTERN_HIMALAYAS', locationName: 'West Siang', state: 'Arunachal Pradesh',
    standard: 'GOLD_STANDARD', lifecycleStage: 'LAND_RESTORATION', manager: 'manager2',
    start: '2025-02-01', end: '2028-12-31', budget: 24500000, metric: 'SPECIES_PROTECTED',
    label: 'Species protected', unit: 'species', target: 80, values: [4, 5, 6, 7, 8, 9, 10],
    sdgs: [6, 13, 14, 15], flagship: true,
  },
  {
    code: 'AV-2023-004', name: 'Hebbal Lake Miyawaki Pilot Forest', category: 'WATERSHED',
    status: 'ACTIVE', landscape: 'OTHER', locationName: 'Hebbal Lake', state: 'Karnataka',
    standard: 'NONE', lifecycleStage: 'LAND_RESTORATION', manager: 'manager2',
    start: '2025-04-01', end: '2026-12-31', budget: 4200000, metric: 'TREES_PLANTED',
    label: 'Trees planted', unit: 'trees', target: 1000, values: [50, 75, 100, 125, 80, 90, 80],
    sdgs: [6, 11, 13, 15], flagship: true,
  },
  {
    code: 'AV-2023-005', name: 'Nilgiri Watershed Revival', category: 'WATERSHED',
    status: 'ON_HOLD', landscape: 'WESTERN_GHATS', locationName: 'Ooty', state: 'Tamil Nadu',
    standard: 'GOLD_STANDARD', lifecycleStage: 'MONITORING', manager: 'manager1',
    start: '2024-04-01', end: '2027-03-31', budget: 11000000, metric: 'HECTARES_RESTORED',
    label: 'Hectares restored', unit: 'ha', target: 450, values: [20, 25, 30, 35, 40, 45, 50],
    sdgs: [6, 11, 13, 15],
  },
  {
    code: 'AV-2023-006', name: 'Vidarbha Soil Carbon Commons', category: 'AGROFORESTRY',
    status: 'ACTIVE', landscape: 'CENTRAL_INDIA', locationName: 'Wardha', state: 'Maharashtra',
    standard: 'PLAN_VIVO', lifecycleStage: 'MONITORING', manager: 'manager2',
    start: '2024-08-01', end: '2027-07-31', budget: 9700000, metric: 'HECTARES_RESTORED',
    label: 'Hectares restored', unit: 'ha', target: 300, values: [35, 40, 45, 50, 55, 60, 55],
    sdgs: [1, 2, 5, 8, 13],
  },
  {
    code: 'AV-2023-007', name: 'Coorg Coffee Agroforestry', category: 'AGROFORESTRY',
    status: 'COMPLETED', landscape: 'WESTERN_GHATS', locationName: 'Coorg', state: 'Karnataka',
    standard: 'PLAN_VIVO', lifecycleStage: 'CREDIT_ISSUANCE', manager: 'manager1',
    start: '2022-01-01', end: '2025-06-30', budget: 13800000, metric: 'TREES_PLANTED',
    label: 'Trees planted', unit: 'trees', target: 5000, values: [500, 650, 700, 800, 850, 750, 750],
    sdgs: [1, 2, 8, 13, 15],
  },
  {
    code: 'AV-2023-008', name: 'Mandla Forest Corridor', category: 'CARBON_FOREST',
    status: 'ACTIVE', landscape: 'CENTRAL_INDIA', locationName: 'Mandla', state: 'Madhya Pradesh',
    standard: 'VERRA_VCS', lifecycleStage: 'VERIFICATION', manager: 'manager1',
    start: '2023-10-01', end: '2026-09-30', budget: 28000000, metric: 'CO2_CAPTURED',
    label: 'CO2 captured', unit: 'tCO2e', target: 6000, values: [700, 750, 800, 850, 900, 650, 550],
    sdgs: [8, 12, 13, 15],
  },
  {
    code: 'AV-2023-009', name: 'Sikkim Pollinator Network', category: 'BIODIVERSITY',
    status: 'PLANNED', landscape: 'EASTERN_HIMALAYAS', locationName: 'Gangtok', state: 'Sikkim',
    standard: 'NONE', lifecycleStage: 'LAND_RESTORATION', manager: 'manager2',
    start: '2027-01-01', end: '2029-12-31', budget: 7600000, metric: 'BIODIVERSITY_SCORE',
    label: 'Biodiversity score', unit: 'score /100', target: 100, values: [], sdgs: [13, 15],
  },
  {
    code: 'AV-2023-010', name: 'Bastar Bamboo Livelihoods', category: 'COMMUNITY_LIVELIHOODS',
    status: 'ACTIVE', landscape: 'CENTRAL_INDIA', locationName: 'Jagdalpur', state: 'Chhattisgarh',
    standard: 'PLAN_VIVO', lifecycleStage: 'MONITORING', manager: 'manager2',
    start: '2024-03-01', end: '2027-02-28', budget: 8400000, metric: 'HOUSEHOLDS_IMPACTED',
    label: 'Households impacted', unit: 'households', target: 600, values: [35, 45, 55, 65, 75, 85, 95],
    sdgs: [1, 2, 5, 8, 10],
  },
  {
    code: 'AV-2023-011', name: 'Wayanad Community Livelihoods', category: 'COMMUNITY_LIVELIHOODS',
    status: 'ON_HOLD', landscape: 'WESTERN_GHATS', locationName: 'Wayanad', state: 'Kerala',
    standard: 'GOLD_STANDARD', lifecycleStage: 'MONITORING', manager: 'manager1',
    start: '2024-07-01', end: '2027-06-30', budget: 6900000, metric: 'HOUSEHOLDS_IMPACTED',
    label: 'Households impacted', unit: 'households', target: 450, values: [20, 30, 40, 50, 60, 50, 40],
    sdgs: [1, 5, 8, 10, 15],
  },
  {
    code: 'AV-2023-012', name: 'Arunachal Headwater Restoration', category: 'WATERSHED',
    status: 'ACTIVE', landscape: 'EASTERN_HIMALAYAS', locationName: 'Tawang', state: 'Arunachal Pradesh',
    standard: 'VERRA_VCS', lifecycleStage: 'CREDIT_ISSUANCE', manager: 'manager2',
    start: '2023-01-01', end: '2026-12-31', budget: 15400000, metric: 'HECTARES_RESTORED',
    label: 'Hectares restored', unit: 'ha', target: 200, values: [35, 35, 35, 35, 35, 35, 35],
    sdgs: [6, 13, 15],
  },
  {
    code: 'AV-2023-013', name: 'Kaveri Riparian Buffer', category: 'BIODIVERSITY',
    status: 'CANCELLED', landscape: 'WESTERN_GHATS', locationName: 'Mysuru', state: 'Karnataka',
    standard: 'NONE', lifecycleStage: 'CORPORATE_OFFSET', manager: 'manager1',
    start: '2023-05-01', end: '2025-05-31', budget: 3100000, metric: 'SPECIES_PROTECTED',
    label: 'Species protected', unit: 'species', target: 25, values: [2, 2, 3, 3, 4, 5, 6],
    sdgs: [6, 14, 15],
  },
  {
    code: 'AV-2023-014', name: 'Deccan Dryland Resilience', category: 'CARBON_FOREST',
    status: 'ACTIVE', landscape: 'OTHER', locationName: 'Anantapur', state: 'Andhra Pradesh',
    standard: 'VERRA_VCS', lifecycleStage: 'LAND_RESTORATION', manager: 'manager1',
    start: '2025-01-01', end: '2028-12-31', budget: 12200000, metric: 'TREES_PLANTED',
    label: 'Trees planted', unit: 'trees', target: 10000, values: [900, 950, 1000, 1100, 1200, 1300, 1400],
    sdgs: [1, 2, 6, 13, 15],
  },
];

async function resetDemoData() {
  await prisma.activityLog.deleteMany();
  await prisma.progressEntry.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.projectGoal.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();
}

async function main() {
  await resetDemoData();
  const passwordHash = await bcrypt.hash(password, 12);
  const userIds = {};

  for (const user of users) {
    const created = await prisma.user.create({
      data: { name: user.name, email: user.email, role: user.role, passwordHash },
    });
    userIds[user.key] = created.id;
  }

  const fieldUserId = userIds.field;
  const entrySources = ['FIELD_SURVEY', 'DRONE', 'SATELLITE', 'SOIL_SAMPLE', 'COMMUNITY_REPORT', 'MANUAL'];
  const now = new Date();

  for (const [index, definition] of projects.entries()) {
    const project = await prisma.project.create({
      data: {
        code: definition.code,
        name: definition.name,
        description: `Synthetic demo data for ${definition.name}.`,
        category: definition.category,
        status: definition.status,
        landscape: definition.landscape,
        locationName: definition.locationName,
        state: definition.state,
        latitude: 10 + index,
        longitude: 74 + index,
        startDate: date(definition.start),
        endDate: date(definition.end),
        budget: definition.budget,
        carbonStandard: definition.standard,
        lifecycleStage: definition.lifecycleStage,
        isFlagship: definition.flagship ?? false,
        sdgs: definition.sdgs,
        managerId: userIds[definition.manager],
      },
    });

    const goal = await prisma.projectGoal.create({
      data: {
        projectId: project.id,
        metricKey: definition.metric,
        label: definition.label,
        unit: definition.unit,
        targetValue: definition.target,
        aggregation: definition.metric === 'BIODIVERSITY_SCORE' ? 'LATEST' : 'SUM',
      },
    });

    await prisma.projectMember.create({
      data: { projectId: project.id, userId: fieldUserId },
    });

    await prisma.activityLog.create({
      data: {
        entity: 'Project',
        entityId: project.id,
        projectId: project.id,
        action: 'CREATED',
        after: { name: project.name, status: project.status },
        userId: userIds[definition.manager],
      },
    });

    for (const [entryIndex, value] of definition.values.entries()) {
      const entryDate = new Date(now);
      entryDate.setUTCMonth(entryDate.getUTCMonth() - (definition.values.length - entryIndex));
      const entry = await prisma.progressEntry.create({
        data: {
          goalId: goal.id,
          value,
          entryDate,
          note: `Synthetic demo field update ${entryIndex + 1}.`,
          type: 'PROGRESS',
          source: entrySources[(index + entryIndex) % entrySources.length],
          createdById: entryIndex % 2 === 0 ? fieldUserId : userIds[definition.manager],
        },
      });

      await prisma.activityLog.create({
        data: {
          entity: 'ProgressEntry',
          entityId: entry.id,
          projectId: project.id,
          action: 'PROGRESS_ADDED',
          after: { goalId: goal.id, value: entry.value, source: entry.source },
          userId: entry.createdById,
        },
      });
    }
  }

  console.log(`Seeded ${users.length} users, ${projects.length} projects, and 91 progress entries.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

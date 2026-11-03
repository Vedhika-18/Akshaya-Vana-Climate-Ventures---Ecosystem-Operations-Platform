import api from '../lib/api';

export const PROJECT_STATUSES = ['PLANNED', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'];
export const PROJECT_CATEGORIES = ['AGROFORESTRY', 'CARBON_FOREST', 'BIODIVERSITY', 'WATERSHED', 'COMMUNITY_LIVELIHOODS'];
export const LANDSCAPES = ['WESTERN_GHATS', 'CENTRAL_INDIA', 'EASTERN_HIMALAYAS', 'OTHER'];
export const CARBON_STANDARDS = ['VERRA_VCS', 'GOLD_STANDARD', 'PLAN_VIVO', 'NONE'];
export const LIFECYCLE_STAGES = ['LAND_RESTORATION', 'MONITORING', 'VERIFICATION', 'CREDIT_ISSUANCE', 'CORPORATE_OFFSET'];
export const METRIC_KEYS = ['TREES_PLANTED', 'HECTARES_RESTORED', 'CO2_CAPTURED', 'SPECIES_PROTECTED', 'HOUSEHOLDS_IMPACTED', 'BIODIVERSITY_SCORE', 'CUSTOM'];
export const AGGREGATIONS = ['SUM', 'LATEST'];
export const ENTRY_SOURCES = ['FIELD_SURVEY', 'DRONE', 'SATELLITE', 'SOIL_SAMPLE', 'COMMUNITY_REPORT', 'MANUAL'];
export const SDGS = [1, 2, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 17];

const fixedUnits = {
  TREES_PLANTED: 'trees',
  HECTARES_RESTORED: 'ha',
  CO2_CAPTURED: 'tCO2e',
  SPECIES_PROTECTED: 'species',
  HOUSEHOLDS_IMPACTED: 'households',
  BIODIVERSITY_SCORE: 'score',
};
export const metricUnit = (key) => fixedUnits[key] ?? '';
export const label = (value) => String(value ?? '').replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
export const statusLabel = label;
export const categoryLabel = label;
export const landscapeLabel = label;
export const lifecycleLabel = label;
export const carbonStandardLabel = label;
export const sourceLabel = label;
export const scheduleHealthLabel = { ON_TRACK: 'On track', AT_RISK: 'At risk', OVERDUE: 'Overdue', NOT_STARTED: 'Not started', COMPLETED: 'Completed' };
export const statusTone = { ACTIVE: 'green', COMPLETED: 'green', PLANNED: 'gold', ON_HOLD: 'gold', CANCELLED: 'red' };
export const scheduleHealthTone = { ON_TRACK: 'green', COMPLETED: 'green', NOT_STARTED: 'gold', AT_RISK: 'gold', OVERDUE: 'red' };
export const sdgColors = { 1: '#e5243b', 2: '#dda63a', 5: '#ff3a21', 6: '#26bde2', 7: '#fcc30b', 8: '#a21942', 10: '#dd1367', 11: '#fd9d24', 12: '#bf8b2e', 13: '#3f7e44', 14: '#0a97d9', 15: '#56c02b', 17: '#19486a' };

export const listProjects = (params) => api.get('/projects', { params });
export const getProject = (id) => api.get(`/projects/${id}`);
export const createProject = (payload) => api.post('/projects', payload);
export const updateProject = (id, payload) => api.put(`/projects/${id}`, payload);
export const archiveProject = (id) => api.delete(`/projects/${id}`);
export const updateLifecycle = (id, payload) => api.put(`/projects/${id}/lifecycle`, payload);
export const addGoal = (id, payload) => api.post(`/projects/${id}/goals`, payload);
export const updateGoal = (goalId, payload) => api.put(`/goals/${goalId}`, payload);
export const deleteGoal = (goalId) => api.delete(`/goals/${goalId}`);
export const addMember = (id, userId) => api.post(`/projects/${id}/members`, { userId });
export const removeMember = (id, userId) => api.delete(`/projects/${id}/members/${userId}`);
export const addProgressEntry = (goalId, payload) => api.post(`/goals/${goalId}/entries`, payload);
export const setGoalTotal = (goalId, payload) => api.post(`/goals/${goalId}/set-total`, payload);
export const listEntries = (goalId, params) => api.get(`/goals/${goalId}/entries`, { params });
export const listActivity = (id, params) => api.get(`/projects/${id}/activity`, { params });
export const listUsers = () => api.get('/users');

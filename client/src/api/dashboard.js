import api from '../lib/api';

export const getDashboard = (range = 'all') => api.get('/dashboard', { params: { range } });
export const getPublicImpact = () => api.get('/public/impact');
export const getRecentActivity = () => api.get('/activity/recent');

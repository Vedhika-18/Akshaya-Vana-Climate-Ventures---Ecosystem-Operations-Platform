import api from '../lib/api';

export const listUsers = () => api.get('/users');
export const createUser = (payload) => api.post('/users', payload);
export const updateUser = (id, payload) => api.put(`/users/${id}`, payload);

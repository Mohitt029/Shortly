import api from './api';

export const urlApi = {
  create: (data) => api.post('/urls', data),
  list: (params = { page: 1, limit: 20 }) => api.get('/urls', { params }),
  get: (shortCode) => api.get(`/urls/${shortCode}`),
  update: (shortCode, data) => api.patch(`/urls/${shortCode}`, data),
  delete: (shortCode) => api.delete(`/urls/${shortCode}`),
};
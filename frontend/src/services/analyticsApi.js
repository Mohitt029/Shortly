import api from './api';

export const analyticsApi = {
  get: (shortCode, days = 30) =>
    api.get(`/analytics/${shortCode}`, { params: { days } }),
  flush: () => api.post('/analytics/flush'),
};
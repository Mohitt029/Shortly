import api from './api';

export const analyticsApi = {
  get: (shortCode, days = 30) =>
    api.get(`/analytics/${shortCode}`, {
      params: { days, _t: Date.now() }, // ⭐ Cache-buster
    }),

  flush: () => api.post('/analytics/flush'),
};
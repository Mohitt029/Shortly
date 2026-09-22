import api from './api';

export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: (refreshToken) =>
    api.post('/auth/logout', { refresh_token: refreshToken }),
  me: () => api.get('/auth/me'),
  regenerateApiKey: () => api.post('/auth/api-key/regenerate'),
};
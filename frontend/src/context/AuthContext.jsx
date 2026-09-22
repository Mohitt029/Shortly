import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authApi } from '../services/authApi';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('shortly_user');
    const token = localStorage.getItem('shortly_access_token');
    if (stored && token) {
      try { setUser(JSON.parse(stored)); } catch { localStorage.removeItem('shortly_user'); }
    }
    setLoading(false);
  }, []);

  const persistAuth = useCallback((data) => {
    const { user, access_token, refresh_token, api_key } = data;
    localStorage.setItem('shortly_access_token', access_token);
    if (refresh_token) localStorage.setItem('shortly_refresh_token', refresh_token);
    if (user) {
      localStorage.setItem('shortly_user', JSON.stringify(user));
      setUser(user);
    }
    if (api_key) localStorage.setItem('shortly_api_key', api_key);
  }, []);

  const register = useCallback(async (data) => {
    const res = await authApi.register(data);
    persistAuth(res.data);
    toast.success(`Welcome, ${res.data.user.name}!`);
    return res.data;
  }, [persistAuth]);

  const login = useCallback(async (data) => {
    const res = await authApi.login(data);
    persistAuth(res.data);
    toast.success(`Welcome back, ${res.data.user.name}!`);
    return res.data;
  }, [persistAuth]);

  const logout = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem('shortly_refresh_token');
      if (refreshToken) await authApi.logout(refreshToken);
    } catch { /* ignore */ }
    localStorage.removeItem('shortly_access_token');
    localStorage.removeItem('shortly_refresh_token');
    localStorage.removeItem('shortly_user');
    localStorage.removeItem('shortly_api_key');
    setUser(null);
    toast.success('Logged out');
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user, loading, isAuthenticated: !!user,
        register, login, logout, setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
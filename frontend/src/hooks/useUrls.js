import { useState, useEffect, useCallback } from 'react';
import { urlApi } from '../services/urlApi';
import toast from 'react-hot-toast';

export function useUrls({ autoLoad = true } = {}) {
  const [urls, setUrls] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchUrls = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const res = await urlApi.list(params);
      setUrls(res.data.urls);
      setPagination(res.data.pagination);
    } catch (err) {
      setError(err.message);
      if (err.status !== 401) toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteUrl = useCallback(async (shortCode) => {
    try {
      await urlApi.delete(shortCode);
      setUrls((prev) => prev.filter((u) => u.shortCode !== shortCode));
      toast.success('URL deleted');
      return true;
    } catch (err) {
      toast.error(err.message);
      return false;
    }
  }, []);

  const updateUrl = useCallback(async (shortCode, data) => {
    try {
      const res = await urlApi.update(shortCode, data);
      setUrls((prev) =>
        prev.map((u) => (u.shortCode === shortCode ? { ...u, ...res.data } : u))
      );
      toast.success('URL updated');
      return res.data;
    } catch (err) {
      toast.error(err.message);
      return null;
    }
  }, []);

  const refresh = useCallback(() => fetchUrls({ page: pagination.page, limit: pagination.limit }), [fetchUrls, pagination]);

  useEffect(() => {
    if (autoLoad) fetchUrls();
  }, [autoLoad, fetchUrls]);

  return {
    urls, pagination, loading, error,
    fetchUrls, refresh, deleteUrl, updateUrl,
  };
}
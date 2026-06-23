import { useState, useCallback } from 'react';
import { authFetch } from '../utils/auth';

/**
 * useApi — for imperative POST/PUT/DELETE calls
 * Usage:
 *   const { call, loading, error, data } = useApi();
 *   await call('/api/quiz/start/slug', { method: 'POST' });
 */
export default function useApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [data, setData]       = useState(null);

  const call = useCallback(async (url, options = {}) => {
    setLoading(true);
    setError(null);
    try {
      const { headers, ...restOptions } = options;
      const res = await authFetch(url, {
        ...restOptions,
        headers: { 'Content-Type': 'application/json', ...(headers || {}) },
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setData(json);
      return json;
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return { call, loading, error, data };
}

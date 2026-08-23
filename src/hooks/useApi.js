/**
 * @file useApi.js
 * @description Standardized asynchronous data fetching and execution hook.
 *
 * Responsibilities:
 * - Manages `data`, `loading`, and `error` state variables for API requests.
 * - Supports immediate execution on mount (`immediate: true`) or deferred manual triggering.
 * - Prevents state updates on unmounted components via cleanup reference.
 * - Returns `refetch` function for easy cache invalidation and reload.
 *
 * Parameters:
 * - apiFn: Async API function to invoke (e.g. `coursesApi.getCourses`).
 * - options:
 *   - immediate: Boolean (default: true).
 *   - initialData: Starting value for data state (default: null).
 *   - params: Arguments array to pass to the API function.
 *
 * Returns:
 * - `{ data, loading, error, execute, refetch, setData }`
 *
 * Expected Usage:
 * ```jsx
 * const { data: courses, loading, error, refetch } = useApi(coursesApi.getCourses);
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export function useApi(apiFn, { immediate = true, initialData = null, params = [] } = {}) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const execute = useCallback(
    async (...args) => {
      setLoading(true);
      setError(null);
      try {
        const callArgs = args.length > 0 ? args : params;
        const result = await apiFn(...callArgs);
        if (isMountedRef.current) {
          setData(result);
          setLoading(false);
        }
        return result;
      } catch (err) {
        // Treat 404 (endpoint not yet implemented) as empty data rather than an error
        const status = err?.response?.status;
        if (isMountedRef.current) {
          if (status === 404) {
            setData([]);
          } else {
            setError(err?.response?.data?.message || err?.response?.data?.error || err?.message || 'An unexpected error occurred');
          }
          setLoading(false);
        }
        if (status !== 404) throw err;
        return [];
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [apiFn, JSON.stringify(params)]
  );

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate]);

  return {
    data,
    loading,
    error,
    execute,
    refetch: execute,
    setData,
  };
}

export default useApi;

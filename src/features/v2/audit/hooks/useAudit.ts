import { useState, useEffect, useCallback } from 'react';
import { auditServiceV2, AuditLogEntry, AuditQuery, AuditAction } from '../services/auditService';

export function useAuditLogs(initialQuery?: AuditQuery) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [query, setQuery] = useState<AuditQuery>({ limit: 50, offset: 0, ...initialQuery });

  const refetch = useCallback(async (newQuery?: AuditQuery) => {
    const merged = newQuery ? { ...query, ...newQuery, offset: 0 } : query;
    if (newQuery) setQuery(merged);
    setLoading(true);
    setError(null);
    try {
      const response = await auditServiceV2.queryAuditLogs(merged);
      if (response.success && response.data) {
        setLogs(response.data.events);
        setTotal(response.data.total);
      } else {
        setError(new Error(response.error?.message || 'Failed to fetch audit logs'));
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch audit logs'));
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMore = useCallback(async () => {
    const nextQuery = { ...query, offset: (query.offset || 0) + (query.limit || 50) };
    setQuery(nextQuery);
    setLoading(true);
    try {
      const response = await auditServiceV2.queryAuditLogs(nextQuery);
      if (response.success && response.data) {
        setLogs(prev => [...prev, ...response.data.events]);
        setTotal(response.data.total);
      }
    } finally {
      setLoading(false);
    }
  }, [query]);

  return {
    logs,
    total,
    loading,
    error,
    refetch,
    loadMore,
    hasMore: logs.length < total,
    query,
  };
}

export function useAuditStats() {
  const [stats, setStats] = useState<{ totalEvents: number; eventsByAction: Record<string, number>; successRate: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const response = await auditServiceV2.getAuditStats();
        if (response.success && response.data) {
          setStats(response.data);
        } else {
          setError(new Error(response.error?.message || 'Failed to fetch audit stats'));
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch audit stats'));
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return { stats, loading, error };
}

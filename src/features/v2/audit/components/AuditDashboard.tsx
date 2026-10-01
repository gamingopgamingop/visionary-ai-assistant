import React, { useState, useEffect, useCallback } from 'react';
import { LoadingState, EmptyState, ErrorDisplay, Pagination } from '../../../shared/components';

interface AuditLogEntry {
  id: string;
  userId?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

interface AuditStats {
  totalEvents: number;
  eventsByAction: Record<string, number>;
  eventsByUser: Record<string, number>;
  successRate: number;
  timeRange: { start: string; end: string };
}

interface AuditFilters {
  userId?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  success?: boolean;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export function AuditDashboard({ className = '' }: { className?: string }) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [filters, setFilters] = useState({
    userId: '',
    action: '',
    resourceType: '',
    resourceId: '',
    success: '',
    startDate: '',
    endDate: '',
    limit: 50,
    offset: 0,
  });
  const [totalCount, setTotalCount] = useState(0);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });

    try {
      const res = await fetch(`/v2/audit-v2?${params}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.events || data);
        setTotalCount(data.total || data.length);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch audit logs'));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchStats = useCallback(async () => {
    const params = new URLSearchParams();
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);

    try {
      const res = await fetch(`/v2/audit-v2/stats?${params}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.warn('Failed to fetch audit stats:', err);
    }
  }, [filters.startDate, filters.endDate]);

  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, [fetchLogs, fetchStats]);

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value, offset: 0 }));
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, offset: (page - 1) * filters.limit }));
  };

  const exportLogs = async () => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    }
    params.append('export', 'true');
    params.append('format', 'csv');

    try {
      const res = await fetch(`/v2/audit-v2?${params}`, { credentials: 'include' });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Failed to export audit logs:', err);
    }
  };

  if (loading) {
    return <LoadingState message="Loading audit logs..." />;
  }

  if (error) {
    return <ErrorDisplay error={error} onRetry={() => { fetchLogs(); fetchStats(); }} />;
  }

  return (
    <div className={`v2-audit-dashboard ${className}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#1f2937', margin: '0 0 0.5rem' }}>
            Audit Logs
          </h1>
          <p style={{ color: '#6b7280', margin: 0 }}>
            Security audit trail for all sensitive operations
          </p>
        </div>
        <button
          onClick={exportLogs}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '0.375rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Export CSV
        </button>
      </div>

      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <StatCard title="Total Events" value={stats.totalEvents.toLocaleString()} icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.73 5.08A10 10 0 1 1 11 20.92" /><path d="M12 12h.01" /><path d="M12 19h.01" /></svg>} />
          <StatCard title="Success Rate" value={`${(stats.successRate * 100).toFixed(1)}%`} icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>} />
          <StatCard title="Unique Users" value={Object.keys(stats.eventsByUser || {}).length.toLocaleString()} icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>} />
          <StatCard title="Top Action" value={Object.entries(stats.eventsByAction || {}).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A'} icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>} />
        </div>
      )}

      <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', fontWeight: 500, color: '#374151' }}>Action</label>
            <select
              value={filters.action}
              onChange={e => handleFilterChange('action', e.target.value)}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
            >
              <option value="">All Actions</option>
              <option value="LOGIN_SUCCESS">LOGIN_SUCCESS</option>
              <option value="LOGIN_FAILED">LOGIN_FAILED</option>
              <option value="LOGOUT">LOGOUT</option>
              <option value="SESSION_REVOKED">SESSION_REVOKED</option>
              <option value="API_KEY_CREATED">API_KEY_CREATED</option>
              <option value="API_KEY_REVOKED">API_KEY_REVOKED</option>
              <option value="API_KEY_ROTATED">API_KEY_ROTATED</option>
              <option value="CONNECTOR_CREATED">CONNECTOR_CREATED</option>
              <option value="CONNECTOR_REVOKED">CONNECTOR_REVOKED</option>
              <option value="CONNECTOR_TOKEN_REFRESHED">CONNECTOR_TOKEN_REFRESHED</option>
              <option value="AI_REQUEST">AI_REQUEST</option>
              <option value="AI_QUOTA_EXCEEDED">AI_QUOTA_EXCEEDED</option>
              <option value="ROLE_CHANGED">ROLE_CHANGED</option>
              <option value="PERMISSION_CHANGED">PERMISSION_CHANGED</option>
              <option value="ADMIN_ACTION">ADMIN_ACTION</option>
            </select>
          </div>

          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', fontWeight: 500', color: '#374151' }}>User ID</label>
            <input
              type="text"
              value={filters.userId}
              onChange={e => handleFilterChange('userId', e.target.value)}
              placeholder="User ID"
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
            />
          </div>

          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', fontWeight: 500', color: '#374151' }}>Resource Type</label>
            <input
              type="text"
              value={filters.resourceType}
              onChange={e => handleFilterChange('resourceType', e.target.value)}
              placeholder="Resource Type"
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', fontWeight: 500', color: '#374151' }}>Success</label>
            <select
              value={filters.success === '' ? '' : String(filters.success)}
              onChange={e => handleFilterChange('success', e.target.value === 'true' ? true : e.target.value === 'false' ? false : '')}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
            >
              <option value="">All</option>
              <option value="true">Success</option>
              <option value="false">Failed</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', fontWeight: 500', color: '#374151' }}>Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={e => handleFilterChange('startDate', e.target.value)}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', fontWeight: 500', color: '#374151' }}>End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={e => handleFilterChange('endDate', e.target.value)}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
            <button
              onClick={() => { setFilters(prev => ({ ...prev, offset: 0 })); }}
              style={{ padding: '0.625rem 1rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.375rem', fontWeight: 500, cursor: 'pointer' }}
            >
              Apply Filters
            </button>
            <button
              onClick={() => setFilters({ userId: '', action: '', resourceType: '', resourceId: '', success: '', startDate: '', endDate: '', limit: 50, offset: 0 })}
              style={{ padding: '0.5rem 1rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', background: 'white' }}
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.5rem', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f9fafb' }}>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Timestamp</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Action</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>User</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Resource</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>IP Address</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <tr key={log.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '0.75rem 1rem', color: '#6b7280', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                  {new Date(log.createdAt).toLocaleString()}
                </td>
                <td style={{ padding: '1rem', fontWeight: 500, color: '#1f2937', whiteSpace: 'nowrap' }}>
                  {log.action}
                </td>
                <td style={{ padding: '1rem', color: '#6b7280', fontSize: '0.875rem' }}>
                  {log.userId ? log.userId.slice(0, 8) + '...' : 'System'}
                </td>
                <td style={{ padding: '1rem', color: '#6b7280', fontSize: '0.875rem' }}>
                  {log.resourceType || '-'}{log.resourceId && `: ${log.resourceId.slice(0, 12)}...`}
                </td>
                <td style={{ padding: '1rem', textAlign: 'center' }}>
                  <span style={{
                    padding: '0.125rem 0.5rem',
                    borderRadius: '9999px',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    backgroundColor: log.success ? '#dcfce7' : '#fef2f2',
                    color: log.success ? '#166534' : '#991b1b',
                  }}>
                    {log.success ? 'Success' : 'Failed'}
                  </span>
                </td>
                <td style={{ padding: '1rem', color: '#6b7280', fontSize: '0.875rem', fontFamily: 'monospace' }}>
                  {log.ipAddress || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={Math.floor(filters.offset / filters.limit) + 1}
        totalPages={Math.ceil(totalCount / filters.limit)}
        onPageChange={handlePageChange}
        showTotal
        totalItems={totalCount}
      />
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {title}
        </span>
        <div style={{ padding: '0.5rem', backgroundColor: '#dbeafe', borderRadius: '0.375rem', color: '#1d4ed8' }}>
          {icon}
        </div>
      </div>
      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1f2937', lineHeight: 1 }}>
        {value}
      </div>
    </div>
  );
}

export function AuditLogTable({ logs, onRowClick }: { logs: any[]; onRowClick?: (log: any) => void }) {
  return (
    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.5rem', overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: '#f9fafb' }}>
            <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Timestamp</th>
            <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Action</th>
            <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>User</th>
            <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Resource</th>
            <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
            <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>IP Address</th>
          </tr>
        </thead>
        <tbody>
          {logs.map(log => (
            <tr key={log.id} style={{ borderBottom: '1px solid #e5e7eb', cursor: onRowClick ? 'pointer' : 'default' }} onClick={() => onRowClick?.(log)}>
              <td style={{ padding: '0.75rem 1rem', color: '#6b7280', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                {new Date(log.createdAt).toLocaleString()}
              </td>
              <td style={{ padding: '1rem', fontWeight: 500, color: '#1f2937', whiteSpace: 'nowrap' }}>
                {log.action}
              </td>
              <td style={{ padding: '1rem', color: '#6b7280', fontSize: '0.875rem' }}>
                {log.userId ? log.userId.slice(0, 8) + '...' : 'System'}
              </td>
              <td style={{ padding: '1rem', color: '#6b7280', fontSize: '0.875rem' }}>
                {log.resourceType || '-'}{log.resourceId && `: ${log.resourceId.slice(0, 12)}...`}
              </td>
              <td style={{ padding: '1rem', textAlign: 'center' }}>
                <span style={{
                  padding: '0.125rem 0.5rem',
                  borderRadius: '9999px',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  backgroundColor: log.success ? '#dcfce7' : '#fef2f2',
                  color: log.success ? '#166534' : '#991b1b',
                }}>
                  {log.success ? 'Success' : 'Failed'}
                </span>
              </td>
              <td style={{ padding: '1rem', color: '#6b7280', fontSize: '0.875rem', fontFamily: 'monospace' }}>
                {log.ipAddress || '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
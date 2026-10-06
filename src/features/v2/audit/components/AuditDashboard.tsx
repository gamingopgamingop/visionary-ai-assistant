import React, { useState } from 'react';
import { useAuditLogs, useAuditStats } from '../hooks/useAudit';
import { AuditLogEntry, AuditAction } from '../services/auditService';
import { LoadingState, EmptyState, ErrorDisplay, Modal } from '../../shared/components';

interface AuditDashboardProps {
  className?: string;
}

const AUDIT_ACTIONS: AuditAction[] = [
  'LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT', 'SESSION_REVOKED',
  'PASSWORD_CHANGED', 'ROLE_CHANGED', 'PERMISSION_CHANGED',
  'API_KEY_CREATED', 'API_KEY_REVOKED', 'API_KEY_ROTATED',
  'CONNECTOR_CREATED', 'CONNECTOR_UPDATED', 'CONNECTOR_REVOKED', 'CONNECTOR_TOKEN_REFRESHED',
  'AI_REQUEST', 'AI_QUOTA_EXCEEDED', 'ADMIN_ACTION',
];

export function AuditDashboard({ className = '' }: AuditDashboardProps) {
  const { logs, total, loading, error, refetch, loadMore, hasMore } = useAuditLogs();
  const { stats } = useAuditStats();
  const [selectedEvent, setSelectedEvent] = useState<AuditLogEntry | null>(null);

  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const applyFilters = () => {
    refetch({
      action: (actionFilter || undefined) as AuditAction | undefined,
      success: statusFilter === '' ? undefined : statusFilter === 'true',
      resourceType: resourceFilter || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });
  };

  const clearFilters = () => {
    setActionFilter('');
    setStatusFilter('');
    setResourceFilter('');
    setStartDate('');
    setEndDate('');
    setSearchQuery('');
    refetch({});
  };

  // Client-side search on metadata/resource (server handles primary filters)
  const filteredLogs = searchQuery
    ? logs.filter(log =>
        log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.resourceType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.resourceId?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : logs;

  if (loading && logs.length === 0) {
    return <LoadingState message="Loading audit logs..." />;
  }

  return (
    <div className={`v2-audit-dashboard ${className}`} style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#1f2937', margin: '0 0 0.5rem' }}>
          Audit Logs
        </h1>
        <p style={{ color: '#6b7280', margin: 0 }}>
          Security and activity trail — {total.toLocaleString()} total events
        </p>
      </div>

      {/* Stats summary */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <StatCard label="Total Events" value={stats.totalEvents.toLocaleString()} />
          <StatCard label="Success Rate" value={`${Math.round(stats.successRate * 100)}%`} />
          <StatCard label="Distinct Actions" value={Object.keys(stats.eventsByAction).length.toString()} />
        </div>
      )}

      {/* Filters */}
      <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label htmlFor="audit-search" style={filterLabelStyle}>Search</label>
            <input
              id="audit-search"
              type="search"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search action or resource..."
              style={filterInputStyle}
            />
          </div>
          <div style={{ minWidth: '160px' }}>
            <label htmlFor="audit-action" style={filterLabelStyle}>Action</label>
            <select id="audit-action" value={actionFilter} onChange={e => setActionFilter(e.target.value)} style={filterInputStyle}>
              <option value="">All Actions</option>
              {AUDIT_ACTIONS.map(action => (
                <option key={action} value={action}>{formatAction(action)}</option>
              ))}
            </select>
          </div>
          <div style={{ minWidth: '120px' }}>
            <label htmlFor="audit-status" style={filterLabelStyle}>Status</label>
            <select id="audit-status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={filterInputStyle}>
              <option value="">All</option>
              <option value="true">Success</option>
              <option value="false">Failed</option>
            </select>
          </div>
          <div style={{ minWidth: '150px' }}>
            <label htmlFor="audit-resource" style={filterLabelStyle}>Resource</label>
            <input id="audit-resource" type="text" value={resourceFilter} onChange={e => setResourceFilter(e.target.value)} placeholder="e.g., connector" style={filterInputStyle} />
          </div>
          <div>
            <label htmlFor="audit-start" style={filterLabelStyle}>From</label>
            <input id="audit-start" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={filterInputStyle} />
          </div>
          <div>
            <label htmlFor="audit-end" style={filterLabelStyle}>To</label>
            <input id="audit-end" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={filterInputStyle} />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={applyFilters} disabled={loading} style={primaryButtonStyle}>
              Apply
            </button>
            <button onClick={clearFilters} disabled={loading} style={secondaryButtonStyle}>
              Clear
            </button>
          </div>
        </div>
      </div>

      {error && <ErrorDisplay error={error} onRetry={() => refetch()} />}

      {/* Audit table */}
      <AuditLogTable logs={filteredLogs} onSelect={setSelectedEvent} />

      {/* Pagination — load-more cursor pattern (never loads the entire table) */}
      {logs.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.5rem' }}>
          {hasMore ? (
            <button
              onClick={loadMore}
              disabled={loading}
              style={{
                padding: '0.625rem 1.5rem',
                backgroundColor: loading ? '#93c5fd' : 'white',
                color: '#3b82f6',
                border: '1px solid #3b82f6',
                borderRadius: '0.375rem',
                fontWeight: 500,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Loading...' : `Load More (${total - logs.length} remaining)`}
            </button>
          ) : (
            <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>All {total.toLocaleString()} events loaded</p>
          )}
        </div>
      )}

      {/* Event details modal */}
      {selectedEvent && (
        <AuditEventDetails event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '1rem' }}>
      <div style={{ fontSize: '0.75rem', fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </div>
      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1f2937', marginTop: '0.25rem' }}>
        {value}
      </div>
    </div>
  );
}

export function AuditLogTable({ logs, onSelect }: { logs: AuditLogEntry[]; onSelect?: (event: AuditLogEntry) => void }) {
  if (logs.length === 0) {
    return (
      <EmptyState
        title="No audit events"
        description="No events match your filters. Audit events are recorded for security-sensitive operations."
      />
    );
  }

  return (
    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.5rem', overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <th style={tableHeaderStyle}>Time</th>
              <th style={tableHeaderStyle}>Action</th>
              <th style={tableHeaderStyle}>Resource</th>
              <th style={tableHeaderStyle}>Status</th>
              <th style={tableHeaderStyle}>IP</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <tr
                key={log.id}
                style={{ borderBottom: '1px solid #f3f4f6', cursor: onSelect ? 'pointer' : 'default' }}
                onClick={() => onSelect?.(log)}
                onMouseEnter={e => { if (onSelect) e.currentTarget.style.backgroundColor = '#f9fafb'; }}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'white')}
              >
                <td style={{ ...tableCellStyle, color: '#6b7280', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>
                  {new Date(log.createdAt).toLocaleString()}
                </td>
                <td style={{ ...tableCellStyle, fontWeight: 500, color: '#1f2937' }}>
                  {formatAction(log.action)}
                </td>
                <td style={{ ...tableCellStyle, color: '#6b7280', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                  {log.resourceType || '—'}
                  {log.resourceId && (
                    <div style={{ color: '#9ca3af', fontSize: '0.625rem' }}>
                      {log.resourceId.slice(0, 12)}…
                    </div>
                  )}
                </td>
                <td style={tableCellStyle}>
                  <span style={{
                    padding: '0.125rem 0.5rem',
                    borderRadius: '9999px',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    backgroundColor: log.success ? '#dcfce7' : '#fef2f2',
                    color: log.success ? '#166534' : '#991b1b',
                  }}>
                    {log.success ? '✓ Success' : '✗ Failed'}
                  </span>
                </td>
                <td style={{ ...tableCellStyle, fontFamily: 'monospace', fontSize: '0.75rem', color: '#6b7280' }}>
                  {log.ipAddress || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AuditEventDetails({ event, onClose }: { event: AuditLogEntry; onClose: () => void }) {
  return (
    <Modal isOpen={true} onClose={onClose} title={`Audit Event — ${formatAction(event.action)}`} size="lg">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <DetailField label="Event ID" value={event.id} mono />
          <DetailField label="Timestamp" value={new Date(event.createdAt).toLocaleString()} />
          <DetailField label="Status" value={event.success ? 'Success' : 'Failed'} />
          <DetailField label="Action" value={event.action} mono />
          {event.resourceType && <DetailField label="Resource Type" value={event.resourceType} mono />}
          {event.resourceId && <DetailField label="Resource ID" value={event.resourceId} mono />}
          {event.ipAddress && <DetailField label="IP Address" value={event.ipAddress} mono />}
        </div>

        {event.userAgent && (
          <div>
            <div style={detailLabelStyle}>User Agent</div>
            <div style={{ ...detailValueStyle, fontSize: '0.75rem', wordBreak: 'break-all' }}>{event.userAgent}</div>
          </div>
        )}

        {event.metadata && Object.keys(event.metadata).length > 0 && (
          <div>
            <div style={detailLabelStyle}>Metadata</div>
            <pre style={{
              backgroundColor: '#1f2937',
              color: '#e5e7eb',
              padding: '1rem',
              borderRadius: '0.5rem',
              fontSize: '0.75rem',
              overflowX: 'auto',
              margin: 0,
            }}>
              {JSON.stringify(event.metadata, null, 2)}
            </pre>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '0.5rem 1.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', background: 'white', color: '#374151', fontWeight: 500, cursor: 'pointer' }}>
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}

function DetailField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div style={detailLabelStyle}>{label}</div>
      <div style={{ ...detailValueStyle, fontFamily: mono ? 'monospace' : undefined, fontSize: mono ? '0.75rem' : '0.875rem', wordBreak: mono ? 'break-all' : undefined }}>
        {value}
      </div>
    </div>
  );
}

const filterLabelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.75rem',
  fontWeight: 500,
  color: '#6b7280',
  marginBottom: '0.25rem',
};

const filterInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem',
  border: '1px solid #d1d5db',
  borderRadius: '0.375rem',
  fontSize: '0.875rem',
};

const primaryButtonStyle: React.CSSProperties = {
  padding: '0.5rem 1.25rem',
  backgroundColor: '#3b82f6',
  color: 'white',
  border: 'none',
  borderRadius: '0.375rem',
  fontWeight: 500,
  cursor: 'pointer',
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: '0.5rem 1.25rem',
  backgroundColor: '#f3f4f6',
  color: '#374151',
  border: '1px solid #d1d5db',
  borderRadius: '0.375rem',
  fontWeight: 500,
  cursor: 'pointer',
};

const tableHeaderStyle: React.CSSProperties = {
  padding: '0.75rem 1rem',
  textAlign: 'left',
  fontSize: '0.75rem',
  fontWeight: 600,
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const tableCellStyle: React.CSSProperties = {
  padding: '0.75rem 1rem',
  verticalAlign: 'middle',
};

const detailLabelStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  fontWeight: 500,
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: '0.25rem',
};

const detailValueStyle: React.CSSProperties = {
  color: '#1f2937',
};

function formatAction(action: string): string {
  return action
    .split('_')
    .map(word => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

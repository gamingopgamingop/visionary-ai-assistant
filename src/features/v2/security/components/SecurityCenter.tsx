import React, { useState, useEffect } from 'react';
import { useAuthV2 } from '../../auth/hooks/useAuthV2';
import { useSessionsV2 } from '../../auth/hooks/useAuthV2';
import { useDevicesV2 } from '../../auth/hooks/useAuthV2';
import { useSecurityEvents } from '../../auth/hooks/useAuthV2';
import { SessionList } from '../../auth/components/SessionList';
import { DeviceList } from '../../auth/components/DeviceList';
import { LoadingState, EmptyState, ErrorDisplay } from '../../../shared/components';
import { SecurityEventV2 } from '../../auth/services/authService';

interface SecurityCenterProps {
  className?: string;
}

type TabId = 'overview' | 'sessions' | 'devices' | 'events';

export function SecurityCenter({ className = '' }: SecurityCenterProps) {
  const { user, authenticated, loading: authLoading } = useAuthV2();
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    const hash = window.location.hash.replace('#', '');
    return (['overview', 'sessions', 'devices', 'events'] as TabId[]).includes(hash as TabId)
      ? (hash as TabId)
      : 'overview';
  });

  // Support deep-linking via hash (#sessions, #devices, #events)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if ((['overview', 'sessions', 'devices', 'events'] as TabId[]).includes(hash as TabId)) {
        setActiveTab(hash as TabId);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  if (authLoading) {
    return <LoadingState message="Loading security center..." fullScreen />;
  }

  if (!authenticated) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', backgroundColor: '#f9fafb' }}>
        <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '2.5rem', width: '100%', maxWidth: '440px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#1f2937', margin: '0 0 0.5rem' }}>Security Center</h1>
          <p style={{ color: '#6b7280', margin: '0 0 2rem' }}>Please sign in to access the security center</p>
          <a href="/v2/auth" style={{ display: 'inline-block', padding: '0.625rem 1.5rem', backgroundColor: '#3b82f6', color: 'white', borderRadius: '0.375rem', fontWeight: 500, textDecoration: 'none' }}>
            Sign In
          </a>
        </div>
      </div>
    );
  }

  const tabs: Array<{ id: TabId; label: string }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'sessions', label: 'Sessions' },
    { id: 'devices', label: 'Devices' },
    { id: 'events', label: 'Security Events' },
  ];

  return (
    <div className={`v2-security-center ${className}`} style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#1f2937', margin: 0 }}>
          Security Center
        </h1>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => window.location.href = '/v2/auth'}
            style={{ padding: '0.5rem 1rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.375rem', fontWeight: 500, cursor: 'pointer' }}
          >
            Auth Settings
          </button>
          <button
            onClick={() => window.location.href = '/v2/api-keys'}
            style={{ padding: '0.5rem 1rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.375rem', fontWeight: 500, cursor: 'pointer' }}
          >
            API Keys
          </button>
        </div>
      </div>

      <div role="tablist" aria-label="Security sections" style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.5rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem', overflowX: 'auto' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`security-panel-${tab.id}`}
            id={`security-tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              fontWeight: activeTab === tab.id ? 600 : 500,
              fontSize: '0.875rem',
              color: activeTab === tab.id ? '#1d4ed8' : '#6b7280',
              backgroundColor: activeTab === tab.id ? '#dbeafe' : 'transparent',
              border: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`security-panel-${activeTab}`} aria-labelledby={`security-tab-${activeTab}`}>
        {activeTab === 'overview' && <SecurityOverview />}
        {activeTab === 'sessions' && <SessionList />}
        {activeTab === 'devices' && <DeviceList />}
        {activeTab === 'events' && <SecurityEventsView />}
      </div>
    </div>
  );
}

function SecurityOverview() {
  const { sessions, loading: sessionsLoading } = useSessionsV2();
  const { devices, loading: devicesLoading } = useDevicesV2();
  const { events, loading: eventsLoading, error: eventsError, refetch: refetchEvents } = useSecurityEvents({ limit: 10 });

  if (sessionsLoading || devicesLoading || eventsLoading) {
    return <LoadingState message="Loading security overview..." />;
  }

  const activeSessions = sessions.filter(s => !s.revoked && new Date(s.expiresAt) > new Date());
  const trustedDevices = devices.filter(d => d.trusted && !d.revoked);
  const failedLogins = events.filter(e => e.eventType === 'LOGIN_FAILED' && !e.success).length;
  const recentEvents = events.slice(0, 5);

  const showFailedLoginsWarning = failedLogins >= 3;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {showFailedLoginsWarning && (
        <div role="alert" style={{ padding: '1rem 1.25rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" style={{ flexShrink: 0 }}>
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <div>
            <strong style={{ color: '#991b1b' }}>Multiple failed login attempts detected</strong>
            <p style={{ color: '#991b1b', margin: 0, fontSize: '0.875rem' }}>
              {failedLogins} failed login attempts recently. If this wasn't you, revoke all sessions immediately.
            </p>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <SecurityMetricCard title="Active Sessions" value={activeSessions.length} status={activeSessions.length > 5 ? 'warning' : 'info'} />
        <SecurityMetricCard title="Trusted Devices" value={trustedDevices.length} status="success" />
        <SecurityMetricCard title="Failed Logins" value={failedLogins} status={failedLogins > 3 ? 'danger' : 'info'} />
        <SecurityMetricCard title="Total Events" value={events.length} status="info" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1f2937', margin: '0 0 1rem' }}>
            Recent Security Events
          </h3>
          {eventsError ? (
            <ErrorDisplay error={eventsError} onRetry={refetchEvents} />
          ) : recentEvents.length === 0 ? (
            <EmptyState title="No recent events" description="Security events will appear here" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {recentEvents.map(event => (
                <EventRow key={event.id} event={event} />
              ))}
            </div>
          )}
          <button
            onClick={() => window.location.href = '/v2/security#events'}
            style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            View all events →
          </button>
        </div>

        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1f2937', margin: '0 0 1rem' }}>
            Quick Actions
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <QuickActionButton label="Manage Sessions" description="View and revoke active sessions" onClick={() => setActiveTabById('sessions')} />
            <QuickActionButton label="Manage Devices" description="View and remove trusted devices" onClick={() => setActiveTabById('devices')} />
            <QuickActionButton label="API Keys" description="Create and manage API keys" onClick={() => window.location.href = '/v2/api-keys'} />
            <QuickActionButton label="Connectors" description="Manage connected services" onClick={() => window.location.href = '/v2/connectors'} />
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper to switch tabs from within the overview (via hash navigation)
function setActiveTabById(tabId: TabId) {
  window.location.hash = tabId;
}

function SecurityEventsView() {
  const { events, loading, error, refetch, hasMore } = useSecurityEvents({ limit: 50 });
  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [successFilter, setSuccessFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleFilter = () => {
    refetch({
      eventType: eventTypeFilter || undefined,
      success: successFilter === '' ? undefined : successFilter === 'true',
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });
  };

  const handleClearFilters = () => {
    setEventTypeFilter('');
    setSuccessFilter('');
    setStartDate('');
    setEndDate('');
    refetch();
  };

  if (loading) return <LoadingState message="Loading security events..." />;
  if (error) return <ErrorDisplay error={error} onRetry={refetch} />;

  return (
    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.5rem', overflow: 'hidden' }}>
      <div style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <label htmlFor="sec-event-type" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#6b7280', marginBottom: '0.25rem' }}>Event Type</label>
          <select
            id="sec-event-type"
            value={eventTypeFilter}
            onChange={e => setEventTypeFilter(e.target.value)}
            style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
          >
            <option value="">All Event Types</option>
            <option value="LOGIN_SUCCESS">Login Success</option>
            <option value="LOGIN_FAILED">Login Failed</option>
            <option value="LOGOUT">Logout</option>
            <option value="SESSION_REVOKED">Session Revoked</option>
            <option value="DEVICE_ADDED">Device Added</option>
            <option value="DEVICE_REVOKED">Device Revoked</option>
            <option value="API_KEY_CREATED">API Key Created</option>
            <option value="API_KEY_REVOKED">API Key Revoked</option>
            <option value="CONNECTOR_CREATED">Connector Created</option>
            <option value="CONNECTOR_REVOKED">Connector Revoked</option>
          </select>
        </div>
        <div>
          <label htmlFor="sec-event-status" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#6b7280', marginBottom: '0.25rem' }}>Status</label>
          <select
            id="sec-event-status"
            value={successFilter}
            onChange={e => setSuccessFilter(e.target.value)}
            style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
          >
            <option value="">All</option>
            <option value="true">Success</option>
            <option value="false">Failed</option>
          </select>
        </div>
        <div>
          <label htmlFor="sec-event-start" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#6b7280', marginBottom: '0.25rem' }}>From</label>
          <input id="sec-event-start" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }} />
        </div>
        <div>
          <label htmlFor="sec-event-end" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#6b7280', marginBottom: '0.25rem' }}>To</label>
          <input id="sec-event-end" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }} />
        </div>
        <button onClick={handleFilter} style={{ padding: '0.5rem 1rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.375rem', fontWeight: 500, cursor: 'pointer' }}>
          Apply Filters
        </button>
        <button onClick={handleClearFilters} style={{ padding: '0.5rem 1rem', backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontWeight: 500, cursor: 'pointer' }}>
          Clear
        </button>
      </div>

      {events.length === 0 ? (
        <EmptyState title="No security events" description="No events match your filters" />
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb' }}>
                <th style={tableHeaderStyle}>Time</th>
                <th style={tableHeaderStyle}>Event</th>
                <th style={tableHeaderStyle}>Status</th>
                <th style={tableHeaderStyle}>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {events.map(event => (
                <tr key={event.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ ...tableCellStyle, color: '#6b7280', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>
                    {new Date(event.createdAt).toLocaleString()}
                  </td>
                  <td style={{ ...tableCellStyle, fontWeight: 500, color: '#1f2937' }}>
                    {formatEventType(event.eventType)}
                  </td>
                  <td style={tableCellStyle}>
                    <span style={{
                      padding: '0.125rem 0.5rem',
                      borderRadius: '9999px',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      backgroundColor: event.success ? '#dcfce7' : '#fef2f2',
                      color: event.success ? '#166534' : '#991b1b',
                    }}>
                      {event.success ? '✓ Success' : '✗ Failed'}
                    </span>
                  </td>
                  <td style={{ ...tableCellStyle, fontFamily: 'monospace', fontSize: '0.8125rem', color: '#6b7280' }}>
                    {event.ipAddress || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

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

function formatEventType(eventType: string): string {
  return eventType
    .split('_')
    .map(word => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

function EventRow({ event }: { event: SecurityEventV2 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem', backgroundColor: '#f9fafb', borderRadius: '0.375rem' }}>
      <span style={{
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: event.success ? '#10b981' : '#ef4444',
        flexShrink: 0,
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 500, color: '#1f2937', fontSize: '0.875rem' }}>
          {formatEventType(event.eventType)}
        </div>
        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
          {new Date(event.createdAt).toLocaleString()}
          {event.ipAddress && ` · ${event.ipAddress}`}
        </div>
      </div>
      <span style={{
        fontSize: '0.7rem',
        padding: '0.125rem 0.375rem',
        borderRadius: '9999px',
        backgroundColor: event.success ? '#dcfce7' : '#fef2f2',
        color: event.success ? '#166534' : '#991b1b',
        fontWeight: 500,
      }}>
        {event.success ? 'Success' : 'Failed'}
      </span>
    </div>
  );
}

function QuickActionButton({ label, description, onClick }: { label: string; description: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '0.75rem 1rem',
        borderRadius: '0.375rem',
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        textAlign: 'left',
        cursor: 'pointer',
        transition: 'background-color 0.15s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f9fafb')}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'white')}
    >
      <div style={{ fontWeight: 500, color: '#1f2937' }}>{label}</div>
      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{description}</div>
    </button>
  );
}

function SecurityMetricCard({ title, value, status }: { title: string; value: number; status: 'info' | 'success' | 'warning' | 'danger' }) {
  const statusColors = {
    info: { bg: '#dbeafe', color: '#1d4ed8', border: '#bfdbfe' },
    success: { bg: '#dcfce7', color: '#166534', border: '#bbf7d0' },
    warning: { bg: '#fef3c7', color: '#92400e', border: '#fde68a' },
    danger: { bg: '#fef2f2', color: '#991b1b', border: '#fecaca' },
  };

  const colors = statusColors[status];

  return (
    <div style={{ background: 'white', border: `1px solid ${colors.border}`, borderRadius: '0.5rem', padding: '1.25rem' }}>
      <div style={{ fontSize: '0.75rem', fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
        {title}
      </div>
      <div style={{ fontSize: '2rem', fontWeight: 700, color: colors.color, lineHeight: 1 }}>
        {value}
      </div>
    </div>
  );
}

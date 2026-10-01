import React, { useState, useEffect } from 'react';
import { useAuthV2, SecurityEventV2 } from '../../auth/hooks/useAuthV2';
import { LoadingState, EmptyState, ErrorDisplay } from '../../../shared/components';

interface SecurityCenterProps {
  className?: string;
}

export function SecurityCenter({ className = '' }: SecurityCenterProps) {
  const { user, authenticated, loading: authLoading, refetch } = useAuthV2();
  const [activeTab, setActiveTab] = useState<'overview' | 'sessions' | 'devices' | 'events' | 'api-keys' | 'connectors'>('overview');
  const [events, setEvents] = useState<SecurityEventV2[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState<Error | null>(null);
  const [eventFilters, setEventFilters] = useState({
    eventType: '',
    success: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    const fetchEvents = async () => {
      setEventsLoading(true);
      try {
        const params = new URLSearchParams();
        Object.entries(eventFilters).forEach(([key, value]) => {
          if (value) params.append(key, value);
        });
        params.append('limit', '50');

        const res = await fetch(`/v2/auth/security-events?${params}`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setEvents(data.events || []);
        }
      } catch (err) {
        setEventsError(err instanceof Error ? err : new Error('Failed to fetch security events'));
      } finally {
        setEventsLoading(false);
      }
    };
    fetchEvents();
  }, [eventFilters]);

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

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8" /><path d="M12 17v4" /></svg> },
    { id: 'sessions', label: 'Sessions', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8" /><path d="M12 17v4" /></svg> },
    { id: 'devices', label: 'Devices', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8" /><path d="M12 17v4" /></svg> },
    { id: 'events', label: 'Security Events', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.73 5.08A10 10 0 1 1 11 20.92" /><path d="M12 12h.01" /><path d="M12 19h.01" /></svg> },
    { id: 'api-keys', label: 'API Keys', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8l-5-5" /><line x1="14" y1="2" x2="14" y2="8" /></svg> },
    { id: 'connectors', label: 'Connectors', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg> },
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

      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.5rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem', overflowX: 'auto' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            disabled={!authenticated && tab.id !== 'overview'}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              fontWeight: 500,
              fontSize: '0.875rem',
              color: activeTab === tab.id ? '#3b82f6' : '#6b7280',
              backgroundColor: activeTab === tab.id ? '#dbeafe' : 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              whiteSpace: 'nowrap',
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && <SecurityOverview />}
      {activeTab === 'sessions' && <SessionList />}
      {activeTab === 'devices' && <DeviceList />}
      {activeTab === 'events' && <SecurityEventsView />}
      {activeTab === 'api-keys' && <ApiKeysOverview />}
      {activeTab === 'connectors' && <ConnectorsOverview />}
    </div>
  );
}

function SecurityOverview() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <SecurityMetricCard title="Active Sessions" value={0} status="info" icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8" /><path d="M12 17v4" /></svg>} />
        <SecurityMetricCard title="Trusted Devices" value={0} status="success" icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>} />
        <SecurityMetricCard title="API Keys" value={0} status="warning" icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8l-5-5" /><line x1="14" y1="2" x2="14" y2="8" /></svg>} />
        <SecurityMetricCard title="Connectors" value={0} status="info" icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>} />
      </div>

      <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1f2937', margin: '0 0 1rem' }}>
          Recent Security Events
        </h3>
        <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
          <p>No recent security events</p>
        </div>
      </div>

      <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1f2937', margin: '0 0 1rem' }}>
          Quick Actions
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <QuickActionButton label="Manage Sessions" description="View and revoke active sessions" onClick={() => window.location.href = '/v2/auth/sessions'} icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8" /><path d="M12 17v4" /></svg>} />
          <QuickActionButton label="Manage Devices" description="View and remove trusted devices" onClick={() => window.location.href = '/v2/security?tab=devices'} icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8" /><path d="M12 17v4" /></svg>} />
          <QuickActionButton label="API Keys" description="Create and manage API keys" onClick={() => window.location.href = '/v2/api-keys'} icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8l-5-5" /><line x1="14" y1="2" x2="14" y2="8" /></svg>} />
          <QuickActionButton label="Connectors" description="Manage connected services" onClick={() => window.location.href = '/v2/connectors'} icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>} />
        </div>
      </div>
    </div>
  );
}

function SecurityEventsView() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ eventType: '', success: '', startDate: '', endDate: '' });

  const fetchEvents = async () => {
    const params = new URLSearchParams({ limit: '50' });
    // Add filters
    fetch(`/v2/auth/security-events?limit=50`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => { setEvents(data.events || []); })
      .finally(() => setLoading(false));
  };

  return (
    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.5rem', overflow: 'hidden' }}>
      <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1f2937', margin: 0 }}>Security Events</h3>
        <button style={{ padding: '0.5rem 1rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.375rem', fontWeight: 500, cursor: 'pointer' }}>
          Export
        </button>
      </div>

      <div style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <select value="" onChange={e => {}} style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}>
          <option value="">All Event Types</option>
          <option value="LOGIN_SUCCESS">Login Success</option>
          <option value="LOGIN_FAILED">Login Failed</option>
          <option value="API_KEY_CREATED">API Key Created</option>
          <option value="API_KEY_REVOKED">API Key Revoked</option>
          <option value="CONNECTOR_CREATED">Connector Created</option>
        </select>
        <input type="date" style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} />
        <input type="date" style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} />
        <button style={{ padding: '0.5rem 1rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}>
          Filter
        </button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f9fafb' }}>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Time</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Event</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>IP Address</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Details</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>No security events found</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ApiKeysOverview() {
  return (
    <div style={{ padding: '1.5rem' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1f2937', margin: '0 0 1rem' }}>API Keys Management</h2>
      <button onClick={() => window.location.href = '/v2/api-keys'} style={{ padding: '0.75rem 1.5rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.375rem', fontWeight: 500, cursor: 'pointer' }}>
        Manage API Keys
      </button>
      <p style={{ marginTop: '1rem', color: '#6b7280' }}>View and manage your API keys from the dedicated API Keys page.</p>
    </div>
  );
}

function ConnectorsOverview() {
  return (
    <div style={{ padding: '1.5rem' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1f2937', margin: '0 0 1rem' }}>Connected Services</h2>
      <button onClick={() => window.location.href = '/v2/connectors'} style={{ padding: '0.75rem 1.5rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.375rem', fontWeight: 500, cursor: 'pointer' }}>
        Manage Connectors
      </button>
      <p style={{ marginTop: '1rem', color: '#6b7280' }}>View and manage your connected services from the Connectors page.</p>
    </div>
  );
}

function QuickActionButton({ label, description, onClick, icon }: { label: string; description: string; onClick: () => void; icon: React.ReactNode }) {
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
        transition: 'all 0.15s',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
      }}
      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
    >
      <div style={{ padding: '0.5rem', backgroundColor: '#dbeafe', borderRadius: '0.375rem', color: '#1d4ed8' }}>
        {icon}
      </div>
      <div>
        <div style={{ fontWeight: 500, color: '#1f2937' }}>{label}</div>
        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{description}</div>
      </div>
    </button>
  );
}

function SecurityMetricCard({ title, value, status, icon }: { title: string; value: number; status: 'info' | 'success' | 'warning' | 'danger'; icon: React.ReactNode }) {
  const statusColors = {
    info: { bg: '#dbeafe', color: '#1d4ed8', border: '#bfdbfe' },
    success: { bg: '#dcfce7', color: '#166534', border: '#bbf7d0' },
    warning: { bg: '#fef3c7', color: '#92400e', border: '#fde68a' },
    danger: { bg: '#fef2f2', color: '#991b1b', border: '#fecaca' },
  };

  const colors = statusColors[status];

  return (
    <div style={{ background: 'white', border: `1px solid ${colors.border}`, borderRadius: '0.5rem', padding: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {title}
        </span>
        <div style={{ padding: '0.5rem', backgroundColor: colors.bg, borderRadius: '0.375rem', color: colors.color }}>
          {icon}
        </div>
      </div>
      <div style={{ fontSize: '2rem', fontWeight: 700, color: '#1f2937', lineHeight: 1 }}>
        {value}
      </div>
    </div>
  );
}
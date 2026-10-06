import React, { useState, useEffect } from 'react';
import { useAuthV2 } from '../hooks/useAuthV2';
import { useSecurityEvents as useSecurityEventsHook } from '../hooks/useAuthV2';
import { SecurityEventV2 } from '../services/authService';
import { LoadingState, EmptyState, ErrorDisplay } from '../../shared/components';

interface SecurityStatusProps {
  className?: string;
}

interface SecurityStatusData {
  mfaEnabled: boolean;
  passwordLastChanged: string | null;
  failedLoginAttempts: number;
  lastFailedLogin: string | null;
  activeSessions: number;
  trustedDevices: number;
  apiKeysCount: number;
  connectorsCount: number;
}

export function SecurityStatus({ className = '' }: SecurityStatusProps) {
  const { user, loading: authLoading, error: authError, refetch } = useAuthV2();
  const { events: securityEvents, loading: eventsLoading, error: eventsError } = useSecurityEvents();
  const [securityData, setSecurityData] = useState<SecurityStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchSecurityData = async () => {
      setLoading(true);
      try {
        const res = await fetch('/v2/auth/security-status', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setSecurityData(data);
        }
      } catch (err) {
        console.warn('Failed to fetch security status:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSecurityData();
  }, []);

  if (authLoading || loading) {
    return <LoadingState message="Loading security status..." />;
  }

  if (authError || error) {
    return <ErrorDisplay error={authError || error} onRetry={() => window.location.reload()} />;
  }

  if (!user) {
    return (
      <EmptyState
        title="Sign in to view security status"
        description="Please sign in to see your security overview"
        action={{ label: 'Sign in', onClick: () => window.location.href = '/v2/auth' }}
        icon={
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: '#9ca3af' }}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        }
      />
    );
  }

  const failedLogins = securityEvents.filter(e => e.eventType === 'LOGIN_FAILED' && e.success === false).length;
  const lastFailedLogin = securityEvents.find(e => e.eventType === 'LOGIN_FAILED' && e.success === false)?.createdAt || null;
  const recentEvents = securityEvents.slice(0, 5);

  return (
    <div className={`v2-security-status ${className}`} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1f2937', margin: 0 }}>
          Security Overview
        </h2>
        <button
          onClick={() => window.location.href = '/v2/security'}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '0.375rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            fontWeight: 500,
            fontSize: '0.875rem',
            cursor: 'pointer',
          }}
        >
          View Security Center
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <SecurityMetricCard
          title="Active Sessions"
          value={securityData?.activeSessions || 0}
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <path d="M8 21h8" />
              <path d="M12 17v4" />
            </svg>
          }
          status="info"
        />
        <SecurityMetricCard
          title="Trusted Devices"
          value={securityData?.trustedDevices || 0}
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          }
          status="success"
        />
        <SecurityMetricCard
          title="API Keys"
          value={securityData?.apiKeysCount || 0}
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8l-5-5" />
              <line x1="14" y1="2" x2="14" y2="8" />
            </svg>
          }
          status="warning"
        />
        <SecurityMetricCard
          title="Connected Connectors"
          value={securityData?.connectorsCount || 0}
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          }
          status="info"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '1.5rem' }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1f2937', margin: '0 0 1rem' }}>
            Recent Security Events
          </h3>
          {eventsLoading ? (
            <LoadingState message="Loading events..." />
          ) : eventsError ? (
            <ErrorDisplay error={eventsError} />
          ) : recentEvents.length === 0 ? (
            <EmptyState
              title="No recent events"
              description="Your security events will appear here"
              icon={
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: '#9ca3af' }}>
                  <path d="M10.73 5.08A10 10 0 1 1 11 20.92" />
                  <path d="M12 12h.01" />
                  <path d="M12 19h.01" />
                </svg>
              }
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {recentEvents.map(event => (
                <SecurityEventRow key={event.id} event={event} />
              ))}
            </div>
          )}
        </div>

        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '1.5rem' }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1f2937', margin: '0 0 1rem' }}>
            Quick Actions
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button
              onClick={() => window.location.href = '/v2/auth/sessions'}
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '0.375rem',
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ padding: '0.5rem', backgroundColor: '#dbeafe', borderRadius: '0.375rem', color: '#1d4ed8' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="3" width="20" height="14" rx="2" />
                    <path d="M8 21h8" />
                    <path d="M12 17v4" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontWeight: 500, color: '#1f2937' }}>Manage Sessions</div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>View and revoke active sessions</div>
                </div>
              </div>
            </button>
            
            <button
              onClick={() => window.location.href = '/v2/security/devices'}
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '0.375rem',
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ padding: '0.5rem', backgroundColor: '#dcfce7', borderRadius: '0.375rem', color: '#166534' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="3" width="20" height="14" rx="2" />
                    <path d="M8 21h8" />
                    <path d="M12 17v4" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontWeight: 500, color: '#1f2937' }}>Manage Devices</div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>View and remove trusted devices</div>
                </div>
              </div>
            </button>

            <button
              onClick={() => window.location.href = '/v2/api-keys'}
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '0.375rem',
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ padding: '0.5rem', backgroundColor: '#fef3c7', borderRadius: '0.375rem', color: '#92400e' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8l-5-5" />
                    <line x1="14" y1="2" x2="14" y2="8" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontWeight: 500, color: '#1f2937' }}>API Keys</div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Create and manage API keys</div>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SecurityMetricCard({ 
  title, 
  value, 
  icon, 
  status 
}: { 
  title: string; 
  value: number; 
  icon: React.ReactNode; 
  status: 'info' | 'success' | 'warning' | 'danger';
}) {
  const statusColors = {
    info: { bg: '#dbeafe', color: '#1d4ed8', border: '#bfdbfe' },
    success: { bg: '#dcfce7', color: '#166534', border: '#bbf7d0' },
    warning: { bg: '#fef3c7', color: '#92400e', border: '#fde68a' },
    danger: { bg: '#fef2f2', color: '#991b1b', border: '#fecaca' },
  };

  const colors = statusColors[status];

  return (
    <div style={{ 
      background: 'white', 
      border: `1px solid ${colors.border}`, 
      borderRadius: '0.5rem', 
      padding: '1.25rem' 
    }}>
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

function SecurityEventRow({ event }: { event: SecurityEventV2 }) {
  const eventIcons: Record<string, { icon: React.ReactNode; color: string }> = {
    LOGIN_SUCCESS: { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>, color: '#10b981' },
    LOGIN_FAILED: { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>, color: '#ef4444' },
    LOGOUT: { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>, color: '#6b7280' },
    SESSION_REVOKED: { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>, color: '#ef4444' },
    DEVICE_ADDED: { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8" /><path d="M12 17v4" /></svg>, color: '#3b82f6' },
    DEVICE_REVOKED: { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>, color: '#ef4444' },
    API_KEY_CREATED: { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8l-5-5" /><line x1="14" y1="2" x2="14" y2="8" /></svg>, color: '#3b82f6' },
    API_KEY_REVOKED: { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>, color: '#ef4444' },
    CONNECTOR_CREATED: { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>, color: '#3b82f6' },
    CONNECTOR_REVOKED: { icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>, color: '#ef4444' },
  };

  const eventInfo = eventIcons[event.eventType] || { 
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /></svg>, 
    color: '#6b7280' 
  };

  const timeAgo = formatRelativeTime(event.createdAt);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', backgroundColor: '#f9fafb', borderRadius: '0.375rem' }}>
      <div style={{ 
        width: '32px', 
        height: '32px', 
        borderRadius: '0.375rem', 
        backgroundColor: `${eventInfo.color}15`, 
        color: eventInfo.color, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        {eventInfo.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 500, color: '#1f2937', fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {event.eventType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
        </div>
        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.125rem' }}>
          {event.success ? 'Success' : 'Failed'} · {timeAgo}
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

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(dateString).toLocaleDateString();
}

function useSecurityEvents() {
  const [events, setEvents] = useState<SecurityEventV2[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const res = await fetch('/v2/auth/security-events?limit=20', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setEvents(data.events || []);
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch security events'));
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  return { events, loading, error };
}
import React, { useState } from 'react';
import { useSessionsV2, SessionDataV2 } from '../hooks/useAuthV2';
import { LoadingState, EmptyState, ErrorDisplay } from '../../../shared/components';
import { ActionButtonProps } from '../../../shared/types';

interface SessionListProps {
  className?: string;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
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
  return formatDate(dateString);
}

interface SessionRowProps {
  session: SessionDataV2;
  currentSessionId?: string;
  onRevoke: (sessionId: string) => Promise<void>;
  revokingIds: Set<string>;
}

function SessionRow({ session, currentSessionId, onRevoke, revokingIds }: SessionRowProps) {
  const isCurrent = session.id === currentSessionId;
  const isRevoking = revokingIds.has(session.id);
  const isExpired = new Date(session.expiresAt) < new Date();

  const handleRevoke = async () => {
    if (window.confirm('Are you sure you want to revoke this session?')) {
      await onRevoke(session.id);
    }
  };

  return (
    <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
      <td style={{ padding: '1rem', verticalAlign: 'middle' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: isRevoking || isExpired 
                ? '#ef4444' 
                : session.revoked 
                  ? '#9ca3af' 
                  : '#10b981',
            }}
            title={isRevoking ? 'Revoking...' : isExpired ? 'Expired' : session.revoked ? 'Revoked' : 'Active'}
          />
          <div>
            <div style={{ fontWeight: 500, color: '#1f2937' }}>
              {session.deviceId ? `Device: ${session.deviceId.slice(0, 8)}...` : 'Unknown device'}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
              {session.ipAddress || 'Unknown IP'}
            </div>
          </div>
        </div>
      </td>
      <td style={{ padding: '1rem', verticalAlign: 'middle', color: '#374151' }}>
        {formatDate(session.createdAt)}
      </td>
      <td style={{ padding: '1rem', verticalAlign: 'middle', color: '#6b7280', fontSize: '0.875rem' }}>
        {formatRelativeTime(session.lastActivityAt)}
        {isCurrent && <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', background: '#dbeafe', color: '#1d4ed8', padding: '0.125rem 0.375rem', borderRadius: '9999px' }}>Current</span>}
        {isExpired && <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', background: '#fef2f2', color: '#991b1b', padding: '0.125rem 0.375rem', borderRadius: '9999px' }}>Expired</span>}
        {session.revoked && <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', background: '#f3f4f6', color: '#4b5563', padding: '0.125rem 0.375rem', borderRadius: '9999px' }}>Revoked</span>}
      </td>
      <td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'right' }}>
        {!isCurrent && !session.revoked && !isExpired && (
          <button
            onClick={handleRevoke}
            disabled={isRevoking}
            style={{
              padding: '0.375rem 0.75rem',
              borderRadius: '0.375rem',
              backgroundColor: '#fef2f2',
              color: '#dc2626',
              border: '1px solid #fecaca',
              fontSize: '0.75rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fee2e2'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
          >
            Revoke
          </button>
        )}
        {isCurrent && (
          <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Current session</span>
        )}
      </td>
    </tr>
  );
}

export function SessionList({ className = '' }: SessionListProps) {
  const { sessions, loading, error, refetch, revokeSession, revokeAllSessions } = useSessionsV2();
  const [revokingIds, setRevokingIds] = useState<Set<string>>(new Set());
  const [showRevokeAll, setShowRevokeAll] = useState(false);

  const activeSessions = sessions.filter(s => !s.revoked && new Date(s.expiresAt) > new Date());
  const revokedSessions = sessions.filter(s => s.revoked);
  const expiredSessions = sessions.filter(s => !s.revoked && new Date(s.expiresAt) <= new Date());

  const handleRevoke = async (sessionId: string) => {
    setRevokingIds(prev => new Set(prev).add(sessionId));
    try {
      await revokeSession(sessionId);
    } finally {
      setRevokingIds(prev => {
        const next = new Set(prev);
        next.delete(sessionId);
        return next;
      });
    }
  };

  const handleRevokeAll = async () => {
    if (!window.confirm(`Revoke ${activeSessions.length} active session(s)? This will sign you out of all devices.`)) {
      return;
    }
    try {
      await revokeAllSessions();
    } catch (err) {
      console.error('Failed to revoke all sessions:', err);
    }
  };

  if (loading) {
    return <LoadingState message="Loading sessions..." />;
  }

  if (error) {
    return <ErrorDisplay error={error} onRetry={refetch} />;
  }

  if (sessions.length === 0) {
    return (
      <EmptyState
        title="No sessions"
        description="You don't have any active sessions"
        icon={
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: '#9ca3af' }}>
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <path d="M8 21h8" />
            <path d="M12 17v4" />
          </svg>
        }
      />
    );
  }

  return (
    <div className={`v2-session-list ${className}`} style={{ background: 'white', borderRadius: '0.5rem', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
      <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1f2937', margin: 0 }}>
          Active Sessions ({activeSessions.length})
        </h2>
        {activeSessions.length > 1 && (
          <button
            onClick={() => setShowRevokeAll(true)}
            style={{
              padding: '0.375rem 0.75rem',
              borderRadius: '0.375rem',
              backgroundColor: '#fef2f2',
              color: '#dc2626',
              border: '1px solid #fecaca',
              fontSize: '0.75rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Revoke all
          </button>
        )}
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f9fafb' }}>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Device</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Created</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Last Activity</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {activeSessions.map(session => (
              <SessionRow
                key={session.id}
                session={session}
                onRevoke={handleRevoke}
                revokingIds={revokingIds}
              />
            ))}
          </tbody>
        </table>
      </div>

      {(revokedSessions.length > 0 || expiredSessions.length > 0) && (
        <div style={{ borderTop: '1px solid #e5e7eb' }}>
          <details style={{ padding: '1rem' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 500, color: '#6b7280' }}>
              Previous sessions ({revokedSessions.length + expiredSessions.length})
            </summary>
            <div style={{ marginTop: '0.5rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f9fafb' }}>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Device</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Created</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Last Activity</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {...revokedSessions, ...expiredSessions}.map(session => (
                    <tr key={session.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '0.75rem 1rem', color: '#6b7280' }}>
                        {session.deviceId ? `Device: ${session.deviceId.slice(0, 8)}...` : 'Unknown device'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#6b7280', fontSize: '0.875rem' }}>
                        {new Date(session.createdAt).toLocaleString()}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#6b7280', fontSize: '0.875rem' }}>
                        {new Date(session.lastActivityAt).toLocaleString()}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span style={{ 
                          fontSize: '0.7rem', 
                          padding: '0.125rem 0.375rem', 
                          borderRadius: '9999px',
                          backgroundColor: session.revoked ? '#f3f4f6' : '#fef2f2',
                          color: session.revoked ? '#4b5563' : '#991b1b',
                        }}>
                          {session.revoked ? 'Revoked' : 'Expired'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
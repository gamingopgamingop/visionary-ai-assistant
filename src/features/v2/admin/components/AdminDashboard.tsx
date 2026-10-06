import React, { useState, useEffect, useCallback } from 'react';
import { useAuthV2 } from '../../auth/hooks/useAuthV2';
import { adminServiceV2, AdminStats, AdminUser, SystemHealthStatus } from '../services/adminService';
import { LoadingState, EmptyState, ErrorDisplay, Modal, ConfirmDialog } from '../../shared/components';
import { RoleManager } from '../../rbac/components/RoleManager';
import { PermissionMatrix } from '../../rbac/components/PermissionMatrix';
import { JobDashboard } from '../../jobs/components/JobDashboard';
import { ProviderDashboard } from '../../providers/components/ProviderDashboard';
import { AuditDashboard } from '../../audit/components/AuditDashboard';
import { UsageDashboard } from '../../usage/components/UsageDashboard';

type AdminTab =
  | 'overview'
  | 'users'
  | 'roles'
  | 'permissions'
  | 'providers'
  | 'jobs'
  | 'health'
  | 'audit';

interface AdminDashboardProps {
  className?: string;
}

/**
 * Admin Dashboard.
 *
 * SECURITY MODEL:
 * - The frontend check (useAuthV2 role) only controls UI visibility.
 * - Every privileged operation hits an /admin/* edge function that
 *   re-verifies role/permissions server-side. The UI gate is never
 *   the security boundary.
 * - If the admin access-check endpoint is not configured (404) or the
 *   user is not an admin, we show Forbidden — not a fake admin view.
 */
export function AdminDashboard({ className = '' }: AdminDashboardProps) {
  const { user, authenticated, loading: authLoading } = useAuthV2();
  const [adminVerified, setAdminVerified] = useState<boolean | null>(null);
  const [verifying, setVerifying] = useState(true);
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [health, setHealth] = useState<SystemHealthStatus | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<Error | null>(null);

  // Server-side verification of admin access before rendering admin UI
  useEffect(() => {
    const verifyAdmin = async () => {
      if (!authenticated) {
        setVerifying(false);
        setAdminVerified(false);
        return;
      }
      setVerifying(true);
      try {
        const response = await adminServiceV2.checkAdminAccess();
        if (response.success) {
          setAdminVerified(response.data.isAdmin === true);
        } else if (response.error?.statusCode === 403) {
          setAdminVerified(false);
        } else if (response.error?.statusCode === 404) {
          // Admin endpoints not configured yet — show "not configured" state
          setAdminVerified(null);
        } else {
          setAdminVerified(false);
        }
      } catch {
        setAdminVerified(false);
      } finally {
        setVerifying(false);
      }
    };
    verifyAdmin();
  }, [authenticated]);

  const fetchAdminData = useCallback(async () => {
    setStatsLoading(true);
    setStatsError(null);
    try {
      const [statsRes, healthRes] = await Promise.all([
        adminServiceV2.getStats(),
        adminServiceV2.getSystemHealth(),
      ]);
      if (statsRes.success) setStats(statsRes.data);
      if (healthRes.success) setHealth(healthRes.data);
      if (!statsRes.success && !healthRes.success) {
        setStatsError(new Error(statsRes.error?.message || 'Admin endpoints not available'));
      }
    } catch (err) {
      setStatsError(err instanceof Error ? err : new Error('Failed to fetch admin data'));
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (adminVerified) {
      fetchAdminData();
    }
  }, [adminVerified, fetchAdminData]);

  if (authLoading || verifying) {
    return <LoadingState message="Verifying access..." fullScreen />;
  }

  if (!authenticated) {
    return (
      <EmptyState
        title="Sign in required"
        description="Sign in to access the admin dashboard."
        action={{ label: 'Sign In', onClick: () => (window.location.href = '/v2/auth') }}
      />
    );
  }

  // Admin endpoints not configured (404) — be honest, show "Not configured"
  if (adminVerified === null) {
    return (
      <div style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center' }}>
        <EmptyState
          title="Admin endpoints not configured"
          description="The /admin access-check endpoint did not respond. The V2 admin backend may not be deployed yet, or the admin feature flag is disabled."
        />
      </div>
    );
  }

  // Forbidden — server said the user is not an admin
  if (!adminVerified) {
    return (
      <div style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center' }}>
        <div style={{ marginBottom: '1rem', fontSize: '3rem' }}>🔒</div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1f2937', margin: '0 0 0.5rem' }}>
          Access Denied
        </h1>
        <p style={{ color: '#6b7280', margin: '0 0 1.5rem' }}>
          Your account ({user?.role || 'unknown role'}) does not have administrator privileges.
          All privileged operations are verified server-side.
        </p>
        <a href="/v2" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 500 }}>
          ← Back to V2 Dashboard
        </a>
      </div>
    );
  }

  const tabs: Array<{ id: AdminTab; label: string }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'users', label: 'Users' },
    { id: 'roles', label: 'Roles' },
    { id: 'permissions', label: 'Permissions' },
    { id: 'providers', label: 'AI Providers' },
    { id: 'jobs', label: 'Jobs' },
    { id: 'health', label: 'System Health' },
    { id: 'audit', label: 'Audit' },
  ];

  return (
    <div className={`v2-admin-dashboard ${className}`} style={{ maxWidth: '1300px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#1f2937', margin: '0 0 0.5rem' }}>
          Admin Dashboard
        </h1>
        <p style={{ color: '#6b7280', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          Server-side verified
          <span style={{
            padding: '0.125rem 0.5rem',
            backgroundColor: '#dcfce7',
            color: '#166534',
            borderRadius: '9999px',
            fontSize: '0.7rem',
            fontWeight: 600,
          }}>
            ADMIN
          </span>
        </p>
      </div>

      {/* Tab bar */}
      <div role="tablist" aria-label="Admin sections" style={{ display: 'flex', gap: '0.25rem', borderBottom: '2px solid #e5e7eb', marginBottom: '1.5rem', overflowX: 'auto', flexWrap: 'nowrap' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '0.75rem 1.25rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
              marginBottom: '-2px',
              fontWeight: activeTab === tab.id ? 600 : 500,
              fontSize: '0.875rem',
              color: activeTab === tab.id ? '#1d4ed8' : '#6b7280',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {activeTab === 'overview' && <AdminOverview stats={stats} health={health} loading={statsLoading} error={statsError} onRefresh={fetchAdminData} />}
        {activeTab === 'users' && <UserManagement />}
        {activeTab === 'roles' && <RoleManager />}
        {activeTab === 'permissions' && <PermissionMatrix />}
        {activeTab === 'providers' && <ProviderDashboard />}
        {activeTab === 'jobs' && <JobDashboard />}
        {activeTab === 'health' && <SystemHealthPanel health={health} loading={statsLoading} onRefresh={fetchAdminData} />}
        {activeTab === 'audit' && <AuditDashboard />}
      </div>
    </div>
  );
}

function AdminOverview({
  stats,
  health,
  loading,
  error,
  onRefresh,
}: {
  stats: AdminStats | null;
  health: SystemHealthStatus | null;
  loading: boolean;
  error: Error | null;
  onRefresh: () => void;
}) {
  if (loading) return <LoadingState message="Loading admin overview..." />;
  if (error) return <ErrorDisplay error={error} onRetry={onRefresh} />;

  const overallHealth = health?.status || 'unknown';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
        <MetricCard label="Total Users" value={stats?.totalUsers ?? 0} />
        <MetricCard label="Active Users" value={stats?.activeUsers ?? 0} />
        <MetricCard label="Connectors" value={stats?.activeConnections ?? 0} sub={`${stats?.totalConnectors ?? 0} total`} />
        <MetricCard label="API Keys" value={stats?.activeApiKeys ?? 0} sub={`${stats?.totalApiKeys ?? 0} total`} />
      </div>

      <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1f2937', margin: '0 0 1rem' }}>
          System Health
        </h3>
        {health ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: overallHealth === 'healthy' ? '#10b981' : overallHealth === 'degraded' ? '#f59e0b' : overallHealth === 'unhealthy' ? '#ef4444' : '#9ca3af',
            }} />
            <span style={{ fontWeight: 600, textTransform: 'capitalize', color: '#1f2937' }}>{overallHealth}</span>
            <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
              {health.checks.length} service checks · {new Date(health.timestamp).toLocaleTimeString()}
            </span>
          </div>
        ) : (
          <p style={{ color: '#9ca3af', margin: 0 }}>Health check endpoint not available</p>
        )}
      </div>
    </div>
  );
}

function UserManagement() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [search, setSearch] = useState('');
  const [statusChanging, setStatusChanging] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ user: AdminUser; status: string } | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await adminServiceV2.listUsers({ limit: 50, search: search || undefined });
      if (response.success) {
        setUsers(response.data);
      } else if (response.error?.statusCode === 404) {
        setError(new Error('User management endpoint not configured'));
      } else if (response.error?.statusCode === 403) {
        setError(new Error('Access denied — admin privileges required (verified server-side)'));
      } else {
        setError(new Error(response.error?.message || 'Failed to fetch users'));
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch users'));
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleStatusChange = async () => {
    if (!confirmAction) return;
    setStatusChanging(confirmAction.user.id);
    try {
      const response = await adminServiceV2.updateUserStatus(confirmAction.user.id, confirmAction.status);
      if (!response.success) {
        setError(new Error(response.error?.message || 'Failed to update user status'));
      }
      setConfirmAction(null);
      await fetchUsers();
    } finally {
      setStatusChanging(null);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', alignItems: 'flex-end' }}>
        <div style={{ flex: 1, maxWidth: '400px' }}>
          <label htmlFor="admin-user-search" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#6b7280', marginBottom: '0.25rem' }}>
            Search users
          </label>
          <input
            id="admin-user-search"
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by email…"
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
          />
        </div>
      </div>

      {error && <ErrorDisplay error={error} onRetry={fetchUsers} />}

      {loading ? (
        <LoadingState message="Loading users..." />
      ) : users.length === 0 ? (
        <EmptyState title="No users found" description="No users match your search, or the user management endpoint is not configured." />
      ) : (
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.5rem', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>Role</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Joined</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ ...tdStyle, fontWeight: 500 }}>{user.email || user.id.slice(0, 8) + '…'}</td>
                    <td style={tdStyle}>
                      <span style={{ padding: '0.125rem 0.5rem', backgroundColor: '#dbeafe', color: '#1d4ed8', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: 600 }}>
                        {user.role}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        padding: '0.125rem 0.5rem',
                        borderRadius: '9999px',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        backgroundColor: user.status === 'active' ? '#dcfce7' : user.status === 'banned' ? '#fef2f2' : '#fef3c7',
                        color: user.status === 'active' ? '#166534' : user.status === 'banned' ? '#991b1b' : '#92400e',
                      }}>
                        {user.status}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, color: '#6b7280', fontSize: '0.8125rem' }}>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      {user.status === 'active' ? (
                        <button
                          onClick={() => setConfirmAction({ user, status: 'suspended' })}
                          disabled={statusChanging === user.id}
                          style={{ padding: '0.25rem 0.625rem', backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer' }}
                        >
                          Suspend
                        </button>
                      ) : (
                        <button
                          onClick={() => setConfirmAction({ user, status: 'active' })}
                          disabled={statusChanging === user.id}
                          style={{ padding: '0.25rem 0.625rem', backgroundColor: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: 500, cursor: 'pointer' }}
                        >
                          Reactivate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {confirmAction && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setConfirmAction(null)}
          onConfirm={handleStatusChange}
          title={`${confirmAction.status === 'suspended' ? 'Suspend' : 'Reactivate'} user?`}
          description={`${confirmAction.user.email || confirmAction.user.id} will be ${confirmAction.status === 'suspended' ? 'suspended and unable to sign in' : 'reactivated'}. This is verified server-side.`}
          confirmLabel={confirmAction.status === 'suspended' ? 'Suspend' : 'Reactivate'}
          variant={confirmAction.status === 'suspended' ? 'danger' : 'default'}
          loading={statusChanging === confirmAction.user.id}
        />
      )}
    </div>
  );
}

function SystemHealthPanel({ health, loading, onRefresh }: { health: SystemHealthStatus | null; loading: boolean; onRefresh: () => void }) {
  if (loading) return <LoadingState message="Loading system health..." />;

  if (!health) {
    return (
      <EmptyState
        title="Health endpoint not available"
        description="The system health endpoint did not respond. The observability subsystem may not be enabled."
        action={{ label: 'Retry', onClick: onRefresh }}
      />
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{
            width: '14px',
            height: '14px',
            borderRadius: '50%',
            backgroundColor: health.status === 'healthy' ? '#10b981' : health.status === 'degraded' ? '#f59e0b' : '#ef4444',
          }} />
          <span style={{ fontSize: '1.25rem', fontWeight: 700, textTransform: 'capitalize', color: '#1f2937' }}>
            {health.status}
          </span>
        </div>
        <button onClick={onRefresh} style={{ padding: '0.5rem 1rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.375rem', fontWeight: 500, cursor: 'pointer' }}>
          Re-check
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {health.checks.map((check, index) => (
          <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.5rem' }}>
            <div>
              <div style={{ fontWeight: 600, color: '#1f2937' }}>{check.service}</div>
              {check.error && <div style={{ fontSize: '0.75rem', color: '#991b1b' }}>{check.error}</div>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {check.latencyMs !== undefined && (
                <span style={{ fontSize: '0.8125rem', color: '#6b7280' }}>{check.latencyMs}ms</span>
              )}
              <span style={{
                padding: '0.25rem 0.625rem',
                borderRadius: '9999px',
                fontSize: '0.7rem',
                fontWeight: 600,
                backgroundColor: check.status === 'healthy' ? '#dcfce7' : check.status === 'degraded' ? '#fef3c7' : '#fef2f2',
                color: check.status === 'healthy' ? '#166534' : check.status === 'degraded' ? '#92400e' : '#991b1b',
                textTransform: 'uppercase',
              }}>
                {check.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '1.25rem' }}>
      <div style={{ fontSize: '0.75rem', fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </div>
      <div style={{ fontSize: '2rem', fontWeight: 700, color: '#1f2937', lineHeight: 1.2 }}>
        {value.toLocaleString()}
      </div>
      {sub && <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{sub}</div>}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '0.75rem 1rem',
  textAlign: 'left',
  fontSize: '0.75rem',
  fontWeight: 600,
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const tdStyle: React.CSSProperties = {
  padding: '0.75rem 1rem',
  verticalAlign: 'middle',
  fontSize: '0.875rem',
  color: '#1f2937',
};

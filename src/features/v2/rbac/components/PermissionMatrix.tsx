import React, { useState, useEffect } from 'react';
import { authServiceV2 } from '../../auth/services/authService';

interface RoleWithPerms {
  id: string;
  name: string;
  description?: string;
  level: number;
  system: boolean;
  permissions?: Array<{ id: string; name: string; resource: string; action: string }>;
}

interface PermItem {
  id: string;
  name: string;
  description?: string;
  resource: string;
  action: string;
}
import { LoadingState, EmptyState, ErrorDisplay, Modal } from '../../shared/components';

interface PermissionMatrixProps {
  className?: string;
}

export function PermissionMatrix({ className = '' }: PermissionMatrixProps) {
  const [roles, setRoles] = useState<RoleWithPerms[]>([]);
  const [permissions, setPermissions] = useState<PermItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        authServiceV2.getRoles(),
        authServiceV2.getPermissions(),
      ]);

      if (rolesRes.success) {
        setRoles(rolesRes.data);
      }
      if (permsRes.success) {
        setPermissions(permsRes.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch data'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAssign = async (roleId: string, permissionIds: string[]) => {
    setAssigning(true);
    try {
      const response = await authServiceV2.assignPermissionsToRole(roleId, permissionIds);
      if (response.success) {
        setShowAssignModal(false);
        fetchData();
      } else {
        throw new Error(response.error?.message || 'Failed to assign permissions');
      }
    } catch (err) {
      throw err;
    } finally {
      setAssigning(false);
    }
  };

  const handleRemove = async (roleId: string, permissionId: string) => {
    if (!window.confirm('Remove this permission from the role?')) return;
    
    try {
      const response = await authServiceV2.removePermissionFromRole(roleId, permissionId);
      if (response.success) {
        fetchData();
      } else {
        throw new Error('Failed to remove permission');
      }
    } catch (err) {
      throw err;
    }
  };

  if (loading) return <LoadingState message="Loading permission matrix..." />;
  if (error) return <ErrorDisplay error={error} onRetry={fetchData} />;

  // Group permissions by resource
  const permissionsByResource = permissions.reduce((acc, perm) => {
    if (!acc[perm.resource]) acc[perm.resource] = [];
    acc[perm.resource].push(perm);
    return acc;
  }, {} as Record<string, unknown[]>);

  return (
    <div className={`v2-permission-matrix ${className}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#1f2937', margin: '0 0 0.5rem' }}>
            Permission Matrix
          </h1>
          <p style={{ color: '#6b7280', margin: 0 }}>
            View and manage role-permission assignments
          </p>
        </div>
        <button
          onClick={() => {
            setShowAssignModal(true);
            setSelectedRoles(roles.filter(r => !r.system).map(r => r.id));
          }}
          disabled={roles.filter(r => !r.system).length === 0}
          style={{
            padding: '0.625rem 1.25rem',
            borderRadius: '0.375rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            fontWeight: 500,
            fontSize: '0.875rem',
            cursor: 'pointer',
            opacity: roles.filter(r => !r.system).length === 0 ? 0.5 : 1,
          }}
        >
          Assign Permissions
        </button>
      </div>

      {error && <ErrorDisplay error={error} onRetry={fetchData} />}

      {loading ? (
        <LoadingState message="Loading matrix..." />
      ) : roles.length === 0 ? (
        <EmptyState title="No roles found" description="Create roles to manage permissions" />
      ) : (
        <div style={{ overflowX: 'auto', background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.75rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb', position: 'sticky', top: 0, zIndex: 10 }}>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Role / Permission</th>
                {permissions.map(perm => (
                  <th key={perm.id} style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', whiteSpace: 'nowrap', minWidth: '60px' }}>
                    <div title={perm.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                      <span style={{ fontSize: '0.625rem', color: '#9ca3af', textTransform: 'uppercase' }}>
                        {perm.resource}
                      </span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#374151' }}>
                        {perm.action}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {roles.map(role => (
                <tr key={role.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '1rem', fontWeight: 500, color: '#1f2937', whiteSpace: 'nowrap', position: 'sticky', left: 0, background: 'white', zIndex: 5 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {role.system && (
                        <span style={{ fontSize: '0.625rem', padding: '0.125rem 0.375rem', backgroundColor: '#fef3c7', color: '#92400e', borderRadius: '9999px', textTransform: 'uppercase' }}>System</span>
                      )}
                      <span style={{ fontWeight: 500 }}>{role.name}</span>
                    </div>
                  </td>
                  {permissions.map(perm => {
                    const hasPermission = role.permissions?.some((p: unknown) => p.id === perm.id);
                    return (
                      <td key={perm.id} style={{ padding: '0.5rem', textAlign: 'center', verticalAlign: 'middle' }}>
                        {hasPermission ? (
                          <button
                            onClick={() => handleRemove(role.id, perm.id)}
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '0.375rem',
                              backgroundColor: '#fef2f2',
                              color: '#dc2626',
                              border: '1px solid #fecaca',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.15s',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fee2e2'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
                            title="Remove permission"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAssign(role.id, [perm.id])}
                            disabled={role.system}
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '0.375rem',
                              backgroundColor: role.system ? '#f3f4f6' : '#dbeafe',
                              color: role.system ? '#9ca3af' : '#3b82f6',
                              border: '1px solid #d1d5db',
                              cursor: role.system ? 'not-allowed' : 'pointer',
                              opacity: role.system ? 0.5 : 1,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.15s',
                            }}
                            onMouseEnter={(e) => { if (!role.system) e.currentTarget.style.backgroundColor = '#bfdbfe'; }}
                            onMouseLeave={(e) => { if (!role.system) e.currentTarget.style.backgroundColor = '#dbeafe'; }}
                            title="Add permission"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="12" y1="5" x2="12" y2="19" />
                              <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                          </button>
                        )}
                      </td>
                    );
                  })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}

export function PermissionBadge({ permission, size = 'md' }: { permission: { resource: string; action: string }; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const formatAction = (action: string) => {
    const icons: Record<string, string> = {
      read: '👁',
      write: '✏',
      create: '➕',
      update: '🔄',
      delete: '🗑',
      manage: '⚙',
      send: '📤',
      invoke: '⚡',
    };
    return icons[action] || action.charAt(0).toUpperCase();
  };

  return (
    <span className={`inline-flex items-center gap-1 font-medium rounded-full ${sizeClasses[size]}`} style={{ 
      backgroundColor: '#f3f4f6', 
      color: '#374151',
      border: '1px solid #e5e7eb',
    }}>
      <span style={{ fontSize: '0.75rem' }}>
        {permission.resource.split('.').pop() || permission.resource}
      </span>
      <span style={{ opacity: 0.5 }}>: </span>
      <span>{formatAction(permission.action)}</span>
    </span>
  );
}
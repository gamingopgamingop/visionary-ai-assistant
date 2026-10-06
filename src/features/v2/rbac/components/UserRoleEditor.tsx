import React, { useState, useEffect, useCallback } from 'react';
import { authServiceV2 } from '../../auth/services/authService';
import { LoadingState, EmptyState, ErrorDisplay, Modal } from '../../shared/components';

interface UserRoleEditorProps {
  userId: string;
  className?: string;
  onClose?: () => void;
}

export function UserRoleEditor({ userId, className = '', onClose }: UserRoleEditorProps) {
  const [userRoles, setUserRoles] = useState<any[]>([]);
  const [availableRoles, setAvailableRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [userRolesRes, rolesRes] = await Promise.all([
        authServiceV2.getUserRoles(userId),
        authServiceV2.getRoles(),
      ]);

      if (userRolesRes.success) {
        setUserRoles(userRolesRes.data);
      }
      if (rolesRes.success) {
        setAvailableRoles(rolesRes.data.filter(r => !r.system));
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch data'));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAssign = async (roleIds: string[]) => {
    setAssigning(true);
    try {
      for (const roleId of roleIds) {
        if (!userRoles.some(ur => ur.roleId === roleId)) {
          const response = await authServiceV2.assignRole(userId, roleId);
          if (!response.success) {
            throw new Error(response.error?.message || `Failed to assign role`);
          }
        }
      }
      setShowAssignModal(false);
      await fetchData();
    } catch (err) {
      throw err;
    } finally {
      setAssigning(false);
    }
  };

  const handleRemove = async (roleId: string) => {
    if (!window.confirm('Remove this role from the user?')) return;
    
    try {
      const response = await authServiceV2.removeRole(userId, roleId);
      if (response.success) {
        await fetchData();
      } else {
        throw new Error('Failed to remove role');
      }
    } catch (err) {
      throw err;
    }
  };

  const unassignedRoles = availableRoles.filter(r => !userRoles.some(ur => ur.roleId === r.id));

  if (loading) return <LoadingState message="Loading user roles..." />;
  if (error) return <ErrorDisplay error={error} onRetry={fetchData} />;

  return (
    <div className={`v2-user-role-editor ${className}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1f2937', margin: '0 0 0.25rem' }}>
            User Roles
          </h2>
          <p style={{ color: '#6b7280', margin: 0, fontSize: '0.875rem' }}>
            Manage role assignments for this user
          </p>
        </div>
        {availableRoles.length > 0 && (
          <button
            onClick={() => setShowAssignModal(true)}
            disabled={assigning}
            style={{
              padding: '0.625rem 1.25rem',
              borderRadius: '0.375rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              fontWeight: 500,
              fontSize: '0.875rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Assign Role
          </button>
        )}
      </div>

      {error && <ErrorDisplay error={error} onRetry={fetchData} />}

      {loading ? (
        <LoadingState message="Loading user roles..." />
      ) : (
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.75rem', overflow: 'hidden' }}>
          {userRoles.length === 0 && availableRoles.length === 0 ? (
            <EmptyState 
              title="No roles available" 
              description="Create roles in the Role Manager to assign them to users"
            />
          ) : (
            <div>
              {userRoles.length > 0 && (
                <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
                  <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1f2937', margin: '0 0 1rem' }}>
                    Assigned Roles ({userRoles.length})
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {userRoles.map(ur => {
                      const role = availableRoles.find(r => r.id === ur.roleId);
                      return (
                        <div 
                          key={ur.roleId} 
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.5rem',
                            padding: '0.5rem 1rem',
                            backgroundColor: '#f3f4f6',
                            borderRadius: '9999px',
                            fontSize: '0.875rem',
                          }}
                        >
                          <span style={{ fontWeight: 500, color: '#1f2937' }}>{role?.name || ur.roleId}</span>
                          <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>granted {new Date(ur.grantedAt).toLocaleDateString()}</span>
                          <button
                            onClick={() => {
                              if (window.confirm(`Remove ${role?.name || ur.roleId} from this user?`)) {
                                removeRole(ur.roleId);
                              }
                            }}
                            style={{
                              marginLeft: '0.5rem',
                              padding: '0.125rem 0.375rem',
                              backgroundColor: '#fef2f2',
                              color: '#dc2626',
                              border: 'none',
                              borderRadius: '0.25rem',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              }

              {availableRoles.length > 0 && (
                <div style={{ padding: '1.5rem', borderTop: '1px solid #e5e7eb' }}>
                  <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1f2937', margin: '0 0 1rem' }}>
                    Available Roles ({availableRoles.filter(r => !userRoles.some(ur => ur.roleId === r.id)).length})
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {availableRoles.filter(r => !userRoles.some(ur => ur.roleId === r.id)).map(role => (
                      <div key={role.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', backgroundColor: '#f3f4f6', borderRadius: '9999px' }}>
                        <span style={{ fontWeight: 500, color: '#1f2937' }}>{role.name}</span>
                        <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Level {role.level}</span>
                        <button
                          onClick={() => assignRole(role.id)}
                          style={{
                            marginLeft: '0.5rem',
                            padding: '0.25rem 0.5rem',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.25rem',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                          }}
                        >
                          Assign
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {onClose && (
        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <button onClick={onClose} style={{ padding: '0.625rem 1.5rem', backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '0.375rem', cursor: 'pointer' }}>
            Close
          </button>
        </div>
      )}
    </div>
  );
}
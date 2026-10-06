import React, { useState, useEffect } from 'react';
import { useAuthV2 } from '../../auth/hooks/useAuthV2';
import { LoadingState, EmptyState, ErrorDisplay, Modal, Tabs, TabList, Tab, TabPanels, TabPanel } from '../../shared/components';
import { authServiceV2 } from '../../auth/services/authService';
import { ActionButtonProps } from '../../shared/types';

interface RoleManagerProps {
  className?: string;
}

export function RoleManager({ className = '' }: RoleManagerProps) {
  const { user, loading: authLoading } = useAuthV2();
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [selectedRole, setSelectedRole] = useState<any | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRole, setEditingRole] = useState<any | null>(null);

  const fetchRoles = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await authServiceV2.getRoles();
      if (response.success) {
        setRoles(response.data);
      } else {
        setError(new Error(response.error?.message || 'Failed to fetch roles'));
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch roles'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleCreateRole = async (data: { name: string; description?: string; level: number }) => {
    try {
      const response = await authServiceV2.createRole(data);
      if (response.success) {
        setShowCreateModal(false);
        await fetchRoles();
      } else {
        throw new Error(response.error?.message || 'Failed to create role');
      }
    } catch (err) {
      throw err;
    }
  };

  const handleUpdateRole = async (roleId: string, data: Partial<{ name: string; description?: string; level: number }>) => {
    try {
      const response = await authServiceV2.updateRole(roleId, data);
      if (response.success) {
        setEditingRole(null);
        await fetchRoles();
      } else {
        throw new Error(response.error?.message || 'Failed to update role');
      }
    } catch (err) {
      throw err;
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!window.confirm('Are you sure you want to delete this role? This action cannot be undone.')) {
      return;
    }
    try {
      const response = await authServiceV2.deleteRole(roleId);
      if (response.success) {
        await fetchRoles();
      } else {
        throw new Error(response.error?.message || 'Failed to delete role');
      }
    } catch (err) {
      throw err;
    }
  };

  const handleAssignPermissions = async (roleId: string, permissionIds: string[]) => {
    try {
      const response = await authServiceV2.assignPermissionsToRole(roleId, permissionIds);
      if (response.success) {
        await fetchRoles();
      } else {
        throw new Error(response.error?.message || 'Failed to assign permissions');
      }
    } catch (err) {
      throw err;
    }
  };

  const handleRemovePermission = async (roleId: string, permissionId: string) => {
    try {
      const response = await authServiceV2.removePermissionFromRole(roleId, permissionId);
      if (response.success) {
        await fetchRoles();
      } else {
        throw new Error(response.error?.message || 'Failed to remove permission');
      }
    } catch (err) {
      throw err;
    }
  };

  if (authLoading) {
    return <LoadingState message="Loading authentication..." fullScreen />;
  }

  if (loading) {
    return <LoadingState message="Loading roles..." />;
  }

  if (error) {
    return <ErrorDisplay error={error} onRetry={fetchRoles} />;
  }

  const systemRoles = roles.filter(r => r.system);
  const customRoles = roles.filter(r => !r.system);

  return (
    <div className={`v2-role-manager ${className}`} style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#1f2937', margin: '0 0 0.5rem' }}>
            Role Manager
          </h1>
          <p style={{ color: '#6b7280', margin: 0 }}>
            Manage roles and their permissions
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
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
          Create Role
        </button>
      </div>

      {error && <ErrorDisplay error={error} onRetry={fetchRoles} />}

      <Tabs activeTab="system" onChange={() => {}} style={{ marginTop: '1.5rem' }}>
        <TabList style={{ borderBottom: '1px solid #e5e7eb', marginBottom: '1.5rem' }}>
          <Tab id="system" label={`System Roles (${systemRoles.length})`} />
          <Tab id="custom" label={`Custom Roles (${customRoles.length})`} />
        </TabList>

        <TabPanel id="system">
          {systemRoles.length === 0 ? (
            <EmptyState title="No system roles" description="System roles are created automatically" />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
              {systemRoles.map(role => (
                <RoleCard key={role.id} role={role} onEdit={setEditingRole} onDelete={handleDeleteRole} disabled={true} />
              ))}
            </div>
          )}
        </TabPanel>

        <TabPanel id="custom">
          {customRoles.length === 0 ? (
            <EmptyState 
              title="No custom roles" 
              description="Create custom roles for your organization"
              action={{ label: 'Create Role', onClick: () => setShowCreateModal(true) }}
              icon={
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: '#9ca3af' }}>
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              }
            />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
              {customRoles.map(role => (
                <RoleCard key={role.id} role={role} onEdit={setEditingRole} onDelete={handleDeleteRole} disabled={false} />
              ))}
            </div>
          )}
        </TabPanel>
      </Tabs>

      {showCreateModal && (
        <CreateRoleModal onClose={() => setShowCreateModal(false)} onSubmit={handleCreateRole} />
      )}

      {editingRole && (
        <EditRoleModal 
          role={editingRole} 
          onClose={() => setEditingRole(null)} 
          onSubmit={handleUpdateRole} 
          onAssignPermissions={handleAssignPermissions}
          onRemovePermission={handleRemovePermission}
        />
      )}
    </div>
  );
}

function RoleCard({ role, onEdit, onDelete, disabled }: { role: any; onEdit: (role: any) => void; onDelete: (id: string) => void; disabled: boolean }) {
  return (
    <div style={{ 
      background: 'white', 
      border: '1px solid #e5e7eb', 
      borderRadius: '0.75rem', 
      padding: '1.5rem',
      opacity: disabled ? 0.7 : 1,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1f2937', margin: 0 }}>
              {role.name}
            </h3>
            {role.system && (
              <span style={{ 
                fontSize: '0.625rem', 
                padding: '0.125rem 0.375rem', 
                backgroundColor: '#fef3c7', 
                color: '#92400e', 
                borderRadius: '9999px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                fontWeight: 600,
              }}>
                System
              </span>
            )}
          </div>
          <p style={{ color: '#6b7280', margin: 0, fontSize: '0.875rem' }}>
            {role.description || 'No description'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <span style={{ 
            padding: '0.25rem 0.75rem', 
            borderRadius: '9999px', 
            fontSize: '0.7rem', 
            fontWeight: 600,
            backgroundColor: '#dbeafe',
            color: '#1d4ed8',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            Level {role.level}
          </span>
        </div>
      </div>

      <div style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
          Permissions ({role.permissions?.length || 0})
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
          {(role.permissions || []).slice(0, 5).map(perm => (
            <span key={perm.id} style={{ 
              fontSize: '0.625rem', 
              padding: '0.125rem 0.375rem', 
              backgroundColor: '#f3f4f6', 
              color: '#4b5563', 
              borderRadius: '9999px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              {perm.name}
            </span>
          ))}
          {(role.permissions?.length || 0) > 5 && (
            <span style={{ fontSize: '0.625rem', color: '#9ca3af' }}>
              +{role.permissions.length - 5} more
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
        <button
          onClick={() => onEdit(role)}
          disabled={disabled}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '0.375rem',
            backgroundColor: disabled ? '#e5e7eb' : 'white',
            color: disabled ? '#9ca3af' : '#3b82f6',
            border: '1px solid #d1d5db',
            fontSize: '0.875rem',
            fontWeight: 500,
            cursor: disabled ? 'not-allowed' : 'pointer',
          }}
        >
          Edit
        </button>
        {!disabled && (
          <button
            onClick={() => onDelete(role.id)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              backgroundColor: '#fef2f2',
              color: '#dc2626',
              border: '1px solid #fecaca',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

function CreateRoleModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (data: any) => Promise<void> }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [level, setLevel] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await onSubmit({ name, description, level });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create role');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Create Role" size="md">
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {error && <div style={{ padding: '0.75rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.375rem', color: '#991b1b' }}>{error}</div>}
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Role Name</label>
            <input 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              required 
              style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} 
              placeholder="e.g., content_editor"
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Description</label>
            <textarea 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              rows={3}
              style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} 
              placeholder="Optional description"
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Level</label>
            <input 
              type="number" 
              value={level} 
              onChange={(e) => setLevel(parseInt(e.target.value) || 0)} 
              min={1} 
              max={99} 
              required
              style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} 
            />
            <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>Higher level = more permissions. System roles: 100 (super_admin), 50 (admin), 10 (user), 1 (viewer)</p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button type="button" onClick={onClose} disabled={loading} style={{ padding: '0.625rem 1rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', background: 'white' }}>
              Cancel
            </button>
            <button type="submit" disabled={loading} style={{ padding: '0.625rem 1rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.375rem' }}>
              {loading ? 'Creating...' : 'Create Role'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

function EditRoleModal({ role, onClose, onSubmit, onAssignPermissions, onRemovePermission }: { role: any; onClose: () => void; onSubmit: (id: string, data: any) => Promise<void>; onAssignPermissions: (roleId: string, permissionIds: string[]) => Promise<void>; onRemovePermission: (roleId: string, permissionId: string) => Promise<void> }) {
  const [name, setName] = useState(role.name);
  const [description, setDescription] = useState(role.description || '');
  const [level, setLevel] = useState(role.level);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPermissions, setShowPermissions] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await onSubmit(role.id, { name, description, level });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={`Edit ${role.name}`} size="lg">
      <Tabs activeTab="details" onChange={setShowPermissions}>
        <TabList style={{ borderBottom: '1px solid #e5e7eb', marginBottom: '1.5rem' }}>
          <Tab id="details" label="Details" />
          <Tab id="permissions" label="Permissions" />
        </TabList>

        <TabPanel id="details">
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {error && <div style={{ padding: '0.75rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.375rem', color: '#991b1b' }}>{error}</div>}
              
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Role Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} required style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Level</label>
                <input type="number" value={level} onChange={(e) => setLevel(parseInt(e.target.value) || 0)} min={1} max={99} required style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" onClick={onClose} disabled={loading} style={{ padding: '0.625rem 1rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', background: 'white' }}>
                  Cancel
                </button>
                <button type="submit" disabled={loading} style={{ padding: '0.625rem 1rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.375rem' }}>
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </form>
        </TabPanel>

        <TabPanel id="permissions">
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1f2937', margin: 0 }}>Role Permissions</h3>
              <button onClick={() => setShowPermissions(true)} style={{ padding: '0.5rem 1rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.375rem' }}>
                Assign Permissions
              </button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
              {(role.permissions || []).map(perm => (
                <span key={perm.id} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', padding: '0.25rem 0.75rem', backgroundColor: '#f3f4f6', color: '#374151', borderRadius: '9999px' }}>
                  <span>{perm.name}</span>
                  <button onClick={() => onRemovePermission(role.id, perm.id)} style={{ marginLeft: '0.375rem', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
                </span>
              ))}
            </div>
          </div>
        </TabPanel>
      </Tabs>
    </Modal>
  );
}
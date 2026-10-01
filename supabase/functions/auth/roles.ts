import { createClient } from '@supabase/supabase-js';
import type { RoleData, RolePermissionData, UserRoleData } from './types.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

export async function getRoles(): Promise<RoleData[]> {
  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .order('level', { ascending: false });

  if (error || !data) return [];
  return data as RoleData[];
}

export async function getRole(roleId: string): Promise<RoleData | null> {
  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .eq('id', roleId)
    .single();

  if (error || !data) return null;
  return data as RoleData;
}

export async function getRoleByName(name: string): Promise<RoleData | null> {
  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .eq('name', name)
    .single();

  if (error || !data) return null;
  return data as RoleData;
}

export async function createRole(
  name: string,
  description: string | undefined,
  level: number,
  system: boolean = false
): Promise<RoleData> {
  const roleId = crypto.randomUUID();
  const now = new Date().toISOString();

  const { error } = await supabase.from('roles').insert({
    id: roleId,
    name,
    description,
    level,
    system,
    created_at: now,
    updated_at: now,
  });

  if (error) {
    throw new Error(`Failed to create role: ${error.message}`);
  }

  return {
    id: roleId,
    name,
    description,
    level,
    system,
    createdAt: now,
    updatedAt: now,
  };
}

export async function updateRole(
  roleId: string,
  updates: { name?: string; description?: string; level?: number }
): Promise<void> {
  const { error } = await supabase
    .from('roles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', roleId);

  if (error) {
    throw new Error(`Failed to update role: ${error.message}`);
  }
}

export async function deleteRole(roleId: string): Promise<void> {
  const role = await getRole(roleId);
  if (role?.system) {
    throw new Error('Cannot delete system role');
  }

  const { error } = await supabase
    .from('roles')
    .delete()
    .eq('id', roleId);

  if (error) {
    throw new Error(`Failed to delete role: ${error.message}`);
  }
}

export async function assignPermissionsToRole(roleId: string, permissionIds: string[]): Promise<void> {
  const now = new Date().toISOString();
  
  const records = permissionIds.map(permissionId => ({
    role_id: roleId,
    permission_id: permissionId,
    created_at: now,
  }));

  const { error } = await supabase
    .from('role_permissions')
    .upsert(records, { onConflict: 'role_id,permission_id' });

  if (error) {
    throw new Error(`Failed to assign permissions: ${error.message}`);
  }
}

export async function removePermissionFromRole(roleId: string, permissionId: string): Promise<void> {
  const { error } = await supabase
    .from('role_permissions')
    .delete()
    .eq('role_id', roleId)
    .eq('permission_id', permissionId);

  if (error) {
    throw new Error(`Failed to remove permission: ${error.message}`);
  }
}

export async function getRolePermissions(roleId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('role_permissions')
    .select('permission_id')
    .eq('role_id', roleId);

  if (error || !data) return [];
  return data.map(rp => rp.permission_id);
}

export async function getUserRoles(userId: string): Promise<UserRoleData[]> {
  const { data, error } = await supabase
    .from('user_roles')
    .select('*')
    .eq('user_id', userId);

  if (error || !data) return [];
  return data as UserRoleData[];
}

export async function assignRoleToUser(
  userId: string,
  roleId: string,
  grantedBy: string | undefined
): Promise<UserRoleData> {
  const now = new Date().toISOString();

  const { error } = await supabase.from('user_roles').upsert({
    user_id: userId,
    role_id: roleId,
    granted_at: now,
    granted_by: grantedBy,
  }, { onConflict: 'user_id,role_id' });

  if (error) {
    throw new Error(`Failed to assign role: ${error.message}`);
  }

  return {
    userId,
    roleId,
    grantedAt: now,
    grantedBy,
  };
}

export async function removeRoleFromUser(userId: string, roleId: string): Promise<void> {
  const { error } = await supabase
    .from('user_roles')
    .delete()
    .eq('user_id', userId)
    .eq('role_id', roleId);

  if (error) {
    throw new Error(`Failed to remove role: ${error.message}`);
  }
}

export async function getUsersWithRole(roleId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('role_id', roleId);

  if (error || !data) return [];
  return data.map(ur => ur.user_id);
}

export const SYSTEM_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  USER: 'user',
  VIEWER: 'viewer',
} as const;

export async function ensureSystemRoles(): Promise<void> {
  const systemRoles = [
    { name: SYSTEM_ROLES.SUPER_ADMIN, description: 'Super administrator with full access', level: 100, system: true },
    { name: SYSTEM_ROLES.ADMIN, description: 'Administrator with elevated access', level: 50, system: true },
    { name: SYSTEM_ROLES.USER, description: 'Standard user', level: 10, system: true },
    { name: SYSTEM_ROLES.VIEWER, description: 'Read-only access', level: 1, system: true },
  ];

  for (const role of systemRoles) {
    const existing = await getRoleByName(role.name);
    if (!existing) {
      await createRole(role.name, role.description, role.level, role.system);
    }
  }
}
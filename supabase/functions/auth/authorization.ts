import { createClient } from '@supabase/supabase-js';
import type { UserIdentity, AuthorizationResult, PermissionData, RoleData } from './types.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const PERMISSION_CACHE = new Map<string, { permissions: string[]; expiresAt: number }>();
const CACHE_TTL = 5 * 60 * 1000;

async function getUserPermissions(userId: string): Promise<string[]> {
  const cached = PERMISSION_CACHE.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.permissions;
  }

  try {
    const { data: userRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('role_id')
      .eq('user_id', userId);

    if (rolesError || !userRoles || userRoles.length === 0) {
      PERMISSION_CACHE.set(userId, { permissions: [], expiresAt: Date.now() + CACHE_TTL });
      return [];
    }

    const roleIds = userRoles.map(r => r.role_id);

    const { data: rolePermissions, error: permsError } = await supabase
      .from('role_permissions')
      .select('permission_id')
      .in('role_id', roleIds);

    if (permsError || !rolePermissions || rolePermissions.length === 0) {
      PERMISSION_CACHE.set(userId, { permissions: [], expiresAt: Date.now() + CACHE_TTL });
      return [];
    }

    const permissionIds = rolePermissions.map(rp => rp.permission_id);

    const { data: permissions, error: detailsError } = await supabase
      .from('permissions')
      .select('name')
      .in('id', permissionIds);

    if (detailsError || !permissions) {
      PERMISSION_CACHE.set(userId, { permissions: [], expiresAt: Date.now() + CACHE_TTL });
      return [];
    }

    const permissionNames = permissions.map(p => p.name);
    PERMISSION_CACHE.set(userId, { permissions: permissionNames, expiresAt: Date.now() + CACHE_TTL });
    
    return permissionNames;
  } catch {
    return [];
  }
}

async function getUserRoles(userId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role_id')
      .eq('user_id', userId);

    if (error || !data) return [];
    return data.map(r => r.role_id);
  } catch {
    return [];
  }
}

async function getRoleDetails(roleId: string): Promise<RoleData | null> {
  try {
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .eq('id', roleId)
      .single();

    if (error || !data) return null;
    return data as RoleData;
  } catch {
    return null;
  }
}

export async function checkPermission(user: UserIdentity, permission: string): Promise<AuthorizationResult> {
  const permissions = await getUserPermissions(user.id);
  const hasPermission = permissions.includes(permission) || permissions.includes('*');
  
  return {
    allowed: hasPermission,
    reason: hasPermission ? undefined : `Missing permission: ${permission}`,
    requiredPermissions: hasPermission ? undefined : [permission],
  };
}

export async function checkPermissions(user: UserIdentity, permissions: string[]): Promise<AuthorizationResult> {
  const userPermissions = await getUserPermissions(user.id);
  const missing = permissions.filter(p => !userPermissions.includes(p) && !userPermissions.includes('*'));
  
  return {
    allowed: missing.length === 0,
    reason: missing.length > 0 ? `Missing permissions: ${missing.join(', ')}` : undefined,
    requiredPermissions: missing.length > 0 ? missing : undefined,
  };
}

export async function checkRole(user: UserIdentity, roleName: string): Promise<AuthorizationResult> {
  const roles = await getUserRoles(user.id);
  
  for (const roleId of roles) {
    const role = await getRoleDetails(roleId);
    if (role?.name === roleName) {
      return { allowed: true };
    }
  }
  
  return { 
    allowed: false, 
    reason: `Missing role: ${roleName}`,
    requiredPermissions: [`role:${roleName}`],
  };
}

export async function checkAnyRole(user: UserIdentity, roleNames: string[]): Promise<AuthorizationResult> {
  const roles = await getUserRoles(user.id);
  
  for (const roleId of roles) {
    const role = await getRoleDetails(roleId);
    if (role && roleNames.includes(role.name)) {
      return { allowed: true };
    }
  }
  
  return { 
    allowed: false, 
    reason: `Missing any of roles: ${roleNames.join(', ')}`,
    requiredPermissions: roleNames.map(r => `role:${r}`),
  };
}

export async function requirePermission(user: UserIdentity, permission: string): Promise<void> {
  const result = await checkPermission(user, permission);
  if (!result.allowed) {
    throw new Error(result.reason || 'Permission denied');
  }
}

export async function requirePermissions(user: UserIdentity, permissions: string[]): Promise<void> {
  const result = await checkPermissions(user, permissions);
  if (!result.allowed) {
    throw new Error(result.reason || 'Permissions denied');
  }
}

export async function requireRole(user: UserIdentity, roleName: string): Promise<void> {
  const result = await checkRole(user, roleName);
  if (!result.allowed) {
    throw new Error(result.reason || 'Role required');
  }
}

export async function requireAnyRole(user: UserIdentity, roleNames: string[]): Promise<void> {
  const result = await checkAnyRole(user, roleNames);
  if (!result.allowed) {
    throw new Error(result.reason || 'Role required');
  }
}

export async function getUserEffectivePermissions(userId: string): Promise<string[]> {
  return getUserPermissions(userId);
}

export function clearPermissionCache(userId: string): void {
  PERMISSION_CACHE.delete(userId);
}
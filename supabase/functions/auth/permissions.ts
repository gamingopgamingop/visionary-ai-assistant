import { createClient } from '@supabase/supabase-js';
import type { PermissionData } from './types.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

export async function getPermissions(): Promise<PermissionData[]> {
  const { data, error } = await supabase
    .from('permissions')
    .select('*')
    .order('resource', { ascending: true })
    .order('action', { ascending: true });

  if (error || !data) return [];
  return data as PermissionData[];
}

export async function getPermission(permissionId: string): Promise<PermissionData | null> {
  const { data, error } = await supabase
    .from('permissions')
    .select('*')
    .eq('id', permissionId)
    .single();

  if (error || !data) return null;
  return data as PermissionData;
}

export async function getPermissionByName(name: string): Promise<PermissionData | null> {
  const { data, error } = await supabase
    .from('permissions')
    .select('*')
    .eq('name', name)
    .single();

  if (error || !data) return null;
  return data as PermissionData;
}

export async function createPermission(
  name: string,
  description: string | undefined,
  resource: string,
  action: string
): Promise<PermissionData> {
  const permissionId = crypto.randomUUID();
  const now = new Date().toISOString();

  const { error } = await supabase.from('permissions').insert({
    id: permissionId,
    name,
    description,
    resource,
    action,
    created_at: now,
  });

  if (error) {
    throw new Error(`Failed to create permission: ${error.message}`);
  }

  return {
    id: permissionId,
    name,
    description,
    resource,
    action,
    createdAt: now,
  };
}

export async function deletePermission(permissionId: string): Promise<void> {
  const { error } = await supabase
    .from('permissions')
    .delete()
    .eq('id', permissionId);

  if (error) {
    throw new Error(`Failed to delete permission: ${error.message}`);
  }
}

export async function getPermissionsByResource(resource: string): Promise<PermissionData[]> {
  const { data, error } = await supabase
    .from('permissions')
    .select('*')
    .eq('resource', resource)
    .order('action', { ascending: true });

  if (error || !data) return [];
  return data as PermissionData[];
}

export const PERMISSIONS = {
  CONNECTOR: {
    READ: 'connector.read',
    CREATE: 'connector.create',
    UPDATE: 'connector.update',
    DELETE: 'connector.delete',
  },
  GITHUB: {
    REPOS_READ: 'github.repositories.read',
    REPOS_WRITE: 'github.repositories.write',
    ISSUES_READ: 'github.issues.read',
    ISSUES_WRITE: 'github.issues.write',
    PRS_READ: 'github.pull_requests.read',
    PRS_WRITE: 'github.pull_requests.write',
  },
  GOOGLE: {
    GMAIL_READ: 'google.gmail.read',
    GMAIL_SEND: 'google.gmail.send',
    DRIVE_READ: 'google.drive.read',
    DRIVE_WRITE: 'google.drive.write',
    CALENDAR_READ: 'google.calendar.read',
    CALENDAR_WRITE: 'google.calendar.write',
  },
  NOTION: {
    PAGES_READ: 'notion.pages.read',
    PAGES_WRITE: 'notion.pages.write',
  },
  STRIPE: {
    CUSTOMERS_READ: 'stripe.customers.read',
    SUBSCRIPTIONS_READ: 'stripe.subscriptions.read',
  },
  AI: {
    CHAT: 'ai.chat',
    COMPLETION: 'ai.completion',
    EMBEDDINGS: 'ai.embeddings',
    IMAGES: 'ai.images',
  },
  ADMIN: {
    USERS_READ: 'admin.users.read',
    USERS_WRITE: 'admin.users.write',
    ROLES_MANAGE: 'admin.roles.manage',
    SETTINGS: 'admin.settings',
  },
} as const;

export async function ensureSystemPermissions(): Promise<void> {
  const allPermissions = [
    { name: PERMISSIONS.CONNECTOR.READ, description: 'Read connector connections', resource: 'connector', action: 'read' },
    { name: PERMISSIONS.CONNECTOR.CREATE, description: 'Create connector connections', resource: 'connector', action: 'create' },
    { name: PERMISSIONS.CONNECTOR.UPDATE, description: 'Update connector connections', resource: 'connector', action: 'update' },
    { name: PERMISSIONS.CONNECTOR.DELETE, description: 'Delete connector connections', resource: 'connector', action: 'delete' },
    
    { name: PERMISSIONS.GITHUB.REPOS_READ, description: 'Read GitHub repositories', resource: 'github.repositories', action: 'read' },
    { name: PERMISSIONS.GITHUB.REPOS_WRITE, description: 'Write GitHub repositories', resource: 'github.repositories', action: 'write' },
    { name: PERMISSIONS.GITHUB.ISSUES_READ, description: 'Read GitHub issues', resource: 'github.issues', action: 'read' },
    { name: PERMISSIONS.GITHUB.ISSUES_WRITE, description: 'Write GitHub issues', resource: 'github.issues', action: 'write' },
    { name: PERMISSIONS.GITHUB.PRS_READ, description: 'Read GitHub pull requests', resource: 'github.pull_requests', action: 'read' },
    { name: PERMISSIONS.GITHUB.PRS_WRITE, description: 'Write GitHub pull requests', resource: 'github.pull_requests', action: 'write' },
    
    { name: PERMISSIONS.GOOGLE.GMAIL_READ, description: 'Read Gmail', resource: 'google.gmail', action: 'read' },
    { name: PERMISSIONS.GOOGLE.GMAIL_SEND, description: 'Send Gmail', resource: 'google.gmail', action: 'send' },
    { name: PERMISSIONS.GOOGLE.DRIVE_READ, description: 'Read Google Drive', resource: 'google.drive', action: 'read' },
    { name: PERMISSIONS.GOOGLE.DRIVE_WRITE, description: 'Write Google Drive', resource: 'google.drive', action: 'write' },
    { name: PERMISSIONS.GOOGLE.CALENDAR_READ, description: 'Read Google Calendar', resource: 'google.calendar', action: 'read' },
    { name: PERMISSIONS.GOOGLE.CALENDAR_WRITE, description: 'Write Google Calendar', resource: 'google.calendar', action: 'write' },
    
    { name: PERMISSIONS.NOTION.PAGES_READ, description: 'Read Notion pages', resource: 'notion.pages', action: 'read' },
    { name: PERMISSIONS.NOTION.PAGES_WRITE, description: 'Write Notion pages', resource: 'notion.pages', action: 'write' },
    
    { name: PERMISSIONS.STRIPE.CUSTOMERS_READ, description: 'Read Stripe customers', resource: 'stripe.customers', action: 'read' },
    { name: PERMISSIONS.STRIPE.SUBSCRIPTIONS_READ, description: 'Read Stripe subscriptions', resource: 'stripe.subscriptions', action: 'read' },
    
    { name: PERMISSIONS.AI.CHAT, description: 'AI chat completion', resource: 'ai', action: 'chat' },
    { name: PERMISSIONS.AI.COMPLETION, description: 'AI text completion', resource: 'ai', action: 'completion' },
    { name: PERMISSIONS.AI.EMBEDDINGS, description: 'AI embeddings', resource: 'ai', action: 'embeddings' },
    { name: PERMISSIONS.AI.IMAGES, description: 'AI image generation', resource: 'ai', action: 'images' },
    
    { name: PERMISSIONS.ADMIN.USERS_READ, description: 'Read admin users', resource: 'admin.users', action: 'read' },
    { name: PERMISSIONS.ADMIN.USERS_WRITE, description: 'Write admin users', resource: 'admin.users', action: 'write' },
    { name: PERMISSIONS.ADMIN.ROLES_MANAGE, description: 'Manage roles', resource: 'admin.roles', action: 'manage' },
    { name: PERMISSIONS.ADMIN.SETTINGS, description: 'Admin settings', resource: 'admin.settings', action: 'manage' },
  ];

  for (const perm of allPermissions) {
    const existing = await getPermissionByName(perm.name);
    if (!existing) {
      await createPermission(perm.name, perm.description, perm.resource, perm.action);
    }
  }
}

export async function getRolePermissionsWithDetails(roleId: string): Promise<PermissionData[]> {
  const { data, error } = await supabase
    .from('role_permissions')
    .select('permissions(*)')
    .eq('role_id', roleId);

  if (error || !data) return [];
  return data.map(rp => rp.permissions).filter(Boolean) as PermissionData[];
}

export async function getUserEffectivePermissions(userId: string): Promise<PermissionData[]> {
  const { data: userRoles, error: rolesError } = await supabase
    .from('user_roles')
    .select('role_id')
    .eq('user_id', userId);

  if (rolesError || !userRoles || userRoles.length === 0) return [];

  const roleIds = userRoles.map(r => r.role_id);

  const { data: rolePermissions, error: permsError } = await supabase
    .from('role_permissions')
    .select('permissions(*)')
    .in('role_id', roleIds);

  if (permsError || !rolePermissions) return [];

  const permissions = rolePermissions
    .map(rp => rp.permissions)
    .filter(Boolean) as PermissionData[];

  const uniquePermissions = new Map<string, PermissionData>();
  for (const perm of permissions) {
    uniquePermissions.set(perm.id, perm);
  }

  return Array.from(uniquePermissions.values());
}
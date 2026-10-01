export * from './types.ts';
export * from './middleware.ts';
export * from './authorization.ts';
export * from './sessions.ts';
export * from './devices.ts';
export * from './roles.ts';
export * from './permissions.ts';
export * from './security.ts';

import { getAuthConfig } from './middleware.ts';
import { ensureSystemRoles } from './roles.ts';
import { ensureSystemPermissions } from './permissions.ts';

export async function initializeAuthSystem(): Promise<void> {
  const config = getAuthConfig();
  
  if (!config.enabled) {
    console.log('New auth system is disabled (NEW_AUTH_ENABLED=false)');
    return;
  }

  console.log('Initializing new auth system...');
  
  await ensureSystemRoles();
  await ensureSystemPermissions();
  
  console.log('New auth system initialized');
}

export function isNewAuthEnabled(): boolean {
  return getAuthConfig().enabled;
}
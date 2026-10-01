export interface AuthConfig {
  enabled: boolean;
  provider: 'supabase' | 'clerk';
  jwtSecret?: string;
  issuer?: string;
  audience?: string;
}

export interface JWTPayload {
  sub: string;
  email?: string;
  role?: string;
  aud?: string;
  iss?: string;
  exp?: number;
  iat?: number;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
}

export interface UserIdentity {
  id: string;
  email?: string;
  role: string;
  metadata: Record<string, unknown>;
  sessionId?: string;
  deviceId?: string;
}

export interface SessionData {
  id: string;
  userId: string;
  deviceId?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  expiresAt: string;
  lastActivityAt: string;
  revoked: boolean;
}

export interface DeviceData {
  id: string;
  userId: string;
  name?: string;
  userAgent?: string;
  ipAddress?: string;
  lastSeenAt: string;
  trusted: boolean;
  revoked: boolean;
}

export interface RoleData {
  id: string;
  name: string;
  description?: string;
  level: number;
  system: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PermissionData {
  id: string;
  name: string;
  description?: string;
  resource: string;
  action: string;
  createdAt: string;
}

export interface RolePermissionData {
  roleId: string;
  permissionId: string;
}

export interface UserRoleData {
  userId: string;
  roleId: string;
  grantedAt: string;
  grantedBy?: string;
}

export interface SecurityEventData {
  id: string;
  userId?: string;
  eventType: SecurityEventType;
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export type SecurityEventType =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'SESSION_REVOKED'
  | 'PASSWORD_CHANGED'
  | 'MFA_ENABLED'
  | 'MFA_DISABLED'
  | 'DEVICE_ADDED'
  | 'DEVICE_REVOKED'
  | 'ROLE_CHANGED'
  | 'PERMISSION_CHANGED'
  | 'API_KEY_CREATED'
  | 'API_KEY_REVOKED'
  | 'API_KEY_ROTATED'
  | 'CONNECTOR_CREATED'
  | 'CONNECTOR_REVOKED'
  | 'CONNECTOR_TOKEN_REFRESHED'
  | 'ADMIN_ACTION';

export interface AuthResult {
  success: boolean;
  user?: UserIdentity;
  session?: SessionData;
  error?: string;
  errorCode?: string;
}

export interface AuthorizationResult {
  allowed: boolean;
  reason?: string;
  requiredPermissions?: string[];
}
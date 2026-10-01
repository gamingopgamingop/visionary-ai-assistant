export interface AuditConfig {
    enabled: boolean;
    retentionDays: number;
    batchSize: number;
    flushIntervalMs: number;
}

export type AuditAction =
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
    | 'CONNECTOR_UPDATED'
    | 'CONNECTOR_REVOKED'
    | 'CONNECTOR_TOKEN_REFRESHED'
    | 'AI_REQUEST'
    | 'AI_QUOTA_EXCEEDED'
    | 'ADMIN_ACTION';

export interface AuditLogEntry {
    id: string;
    userId?: string;
    action: AuditAction;
    resourceType?: string;
    resourceId?: string;
    success: boolean;
    ipAddress?: string;
    userAgent?: string;
    metadata: Record<string, unknown>;
    createdAt: string;
}

export interface AuditLogQuery {
    userId?: string;
    action?: AuditAction;
    resourceType?: string;
    resourceId?: string;
    success?: boolean;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
}

export interface AuditStats {
    totalEvents: number;
    eventsByAction: Record<string, number>;
    eventsByUser: Record<string, number>;
    successRate: number;
    timeRange: { start: string; end: string };
}
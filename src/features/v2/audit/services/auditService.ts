import { apiClient } from '../../shared/services/apiClient';
import { ApiResponse, PaginationParams } from '../../shared/types';

export type AuditAction =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'SESSION_REVOKED'
  | 'PASSWORD_CHANGED'
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

export interface AuditQuery extends PaginationParams {
  action?: AuditAction;
  resourceType?: string;
  success?: boolean;
  startDate?: string;
  endDate?: string;
  sortBy?: 'createdAt' | 'action';
  sortDir?: 'asc' | 'desc';
}

export class AuditServiceV2 {
  async queryAuditLogs(query: AuditQuery): Promise<ApiResponse<{ events: AuditLogEntry[]; total: number }>> {
    return apiClient.get<{ events: AuditLogEntry[]; total: number }>('/audit', query as Record<string, unknown>);
  }

  async getAuditEvent(eventId: string): Promise<ApiResponse<AuditLogEntry>> {
    return apiClient.get<AuditLogEntry>(`/audit/${eventId}`);
  }

  async getAuditStats(query?: { startDate?: string; endDate?: string }): Promise<ApiResponse<{
    totalEvents: number;
    eventsByAction: Record<string, number>;
    successRate: number;
  }>> {
    return apiClient.get('/audit/stats', query);
  }
}

export const auditServiceV2 = new AuditServiceV2();

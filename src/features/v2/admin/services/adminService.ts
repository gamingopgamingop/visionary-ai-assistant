import { apiClient } from '../../shared/services/apiClient';
import { ApiResponse } from '../../shared/types';

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalConnectors: number;
  activeConnections: number;
  totalApiKeys: number;
  activeApiKeys: number;
}

export interface AdminUser {
  id: string;
  email?: string;
  fullName?: string;
  role: string;
  status: string;
  createdAt: string;
  lastSignInAt?: string;
}

export interface SystemHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Array<{
    service: string;
    status: string;
    latencyMs?: number;
    error?: string;
    timestamp: number;
  }>;
  timestamp: number;
}

export class AdminServiceV2 {
  /**
   * Verify the current user has admin privileges.
   * The backend re-verifies this on every privileged call — the frontend
   * check is only for UI gating, never a security boundary.
   */
  async checkAdminAccess(): Promise<ApiResponse<{ isAdmin: boolean; role: string }>> {
    return apiClient.get<{ isAdmin: boolean; role: string }>('/admin/access-check');
  }

  async getStats(): Promise<ApiResponse<AdminStats>> {
    return apiClient.get<AdminStats>('/admin/stats');
  }

  async listUsers(params?: { limit?: number; offset?: number; search?: string }): Promise<ApiResponse<AdminUser[]>> {
    return apiClient.get<AdminUser[]>('/admin/users', params);
  }

  async updateUserStatus(userId: string, status: string): Promise<ApiResponse<void>> {
    return apiClient.patch<void>(`/admin/users/${userId}/status`, { status });
  }

  async getSystemHealth(): Promise<ApiResponse<SystemHealthStatus>> {
    return apiClient.get<SystemHealthStatus>('/admin/system-health');
  }
}

export const adminServiceV2 = new AdminServiceV2();

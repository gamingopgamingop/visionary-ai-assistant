import { apiClient } from '../../shared/services/apiClient';
import { 
  ApiResponse, 
  PaginatedResponse, 
  PaginationParams 
} from '../../shared/types';

export interface UserIdentityV2 {
  id: string;
  email?: string;
  role: string;
  metadata: Record<string, unknown>;
  sessionId?: string;
  deviceId?: string;
}

export interface SessionDataV2 {
  id: string;
  userId: string;
  deviceId?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  expiresAt: string;
  lastActivityAt: string;
  revoked: boolean;
  current?: boolean;
}

export interface DeviceDataV2 {
  id: string;
  userId: string;
  name?: string;
  userAgent?: string;
  ipAddress?: string;
  lastSeenAt: string;
  trusted: boolean;
  revoked: boolean;
  current?: boolean;
}

export interface SecurityEventV2 {
  id: string;
  userId?: string;
  eventType: string;
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface AuthStatusResponse {
  authenticated: boolean;
  user?: UserIdentityV2;
  featureFlags?: Record<string, boolean>;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  fullName?: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirmRequest {
  token: string;
  password: string;
}

export interface SessionRevokeRequest {
  sessionId: string;
}

export interface DeviceRevokeRequest {
  deviceId: string;
}

export interface TrustDeviceRequest {
  deviceId: string;
}

export interface SecurityEventsQuery extends PaginationParams {
  eventType?: string;
  success?: boolean;
  startDate?: string;
  endDate?: string;
}

export class AuthServiceV2 {
  async getAuthStatus(): Promise<ApiResponse<AuthStatusResponse>> {
    return apiClient.get<AuthStatusResponse>('/auth/status');
  }

  async login(credentials: LoginRequest): Promise<ApiResponse<{ user: UserIdentityV2 }>> {
    return apiClient.post('/auth/login', credentials);
  }

  async signup(data: SignupRequest): Promise<ApiResponse<{ user: UserIdentityV2 }>> {
    return apiClient.post('/auth/signup', data);
  }

  async logout(): Promise<ApiResponse<void>> {
    return apiClient.post('/auth/logout');
  }

  async requestPasswordReset(data: PasswordResetRequest): Promise<ApiResponse<void>> {
    return apiClient.post('/auth/password-reset', data);
  }

  async confirmPasswordReset(data: PasswordResetConfirmRequest): Promise<ApiResponse<void>> {
    return apiClient.post('/auth/password-reset/confirm', data);
  }

  async getSessions(): Promise<ApiResponse<SessionDataV2[]>> {
    return apiClient.get<SessionDataV2[]>('/auth/sessions');
  }

  async revokeSession(sessionId: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/auth/sessions/${sessionId}`);
  }

  async revokeAllSessions(exceptSessionId?: string): Promise<ApiResponse<void>> {
    return apiClient.post('/auth/sessions/revoke-all', { exceptSessionId });
  }

  async getDevices(): Promise<ApiResponse<DeviceDataV2[]>> {
    return apiClient.get<DeviceDataV2[]>('/auth/devices');
  }

  async revokeDevice(deviceId: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/auth/devices/${deviceId}`);
  }

  async trustDevice(deviceId: string): Promise<ApiResponse<void>> {
    return apiClient.post<void>(`/auth/devices/${deviceId}/trust`);
  }

  async getSecurityEvents(query?: {
    eventType?: string;
    success?: boolean;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<{ events: SecurityEventV2[]; total: number }>> {
    return apiClient.get<{ events: SecurityEventV2[]; total: number }>('/auth/security-events', query);
  }

  async getRoles(): Promise<ApiResponse<{ id: string; name: string; description?: string; level: number }[]>> {
    return apiClient.get('/auth/roles');
  }

  async getPermissions(): Promise<ApiResponse<{ id: string; name: string; description?: string; resource: string; action: string }[]>> {
    return apiClient.get('/auth/permissions');
  }

  async getUserRoles(userId: string): Promise<ApiResponse<{ roleId: string; grantedAt: string }[]>> {
    return apiClient.get(`/auth/users/${userId}/roles`);
  }

  async assignRole(userId: string, roleId: string): Promise<ApiResponse<void>> {
    return apiClient.post(`/auth/users/${userId}/roles`, { roleId });
  }

  async removeRole(userId: string, roleId: string): Promise<ApiResponse<void>> {
    return apiClient.delete(`/auth/users/${userId}/roles/${roleId}`);
  }
}

export const authServiceV2 = new AuthServiceV2();
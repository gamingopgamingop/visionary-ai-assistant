import { apiClient } from '../../shared/services/apiClient';
import { 
  ApiResponse, 
  PaginatedResponse, 
  PaginationParams,
  ConnectorConfig,
  ConnectorConnection,
  ConnectorCredentials,
  ConnectorActionResult,
  ConnectionTestResult,
} from '../../shared/types';

// Re-export connector types so hooks can import them from this service module
export type {
  ConnectorConfig,
  ConnectorConnection,
  ConnectorCredentials,
  ConnectorActionResult,
  ConnectionTestResult,
};

export interface ConnectorConfigResponse {
  connectors: ConnectorConfig[];
}

export interface CreateConnectionRequest {
  connectorId: string;
  name: string;
  credentials: ConnectorCredentials;
  config?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface UpdateConnectionRequest {
  name?: string;
  status?: string;
  config?: Record<string, unknown>;
  permissions?: string[];
  metadata?: Record<string, unknown>;
}

export interface ConnectorOAuthRequest {
  connectorId: string;
  redirectUri: string;
  scopes?: string[];
}

export interface ConnectorOAuthResponse {
  authorizationUrl: string;
  state: string;
}

export interface ConnectorOAuthCallbackRequest {
  state: string;
  code: string;
}

export interface ConnectorActionRequest {
  action: string;
  params: Record<string, unknown>;
}

export interface ConnectorTestResultResponse {
  success: boolean;
  message?: string;
  data?: Record<string, unknown>;
}

export class ConnectorServiceV2 {
  async listConnectors(enabledOnly = false): Promise<ApiResponse<ConnectorConfig[]>> {
    return apiClient.get<ConnectorConfig[]>('/connectors', { enabled: enabledOnly });
  }

  async getConnector(connectorId: string): Promise<ApiResponse<ConnectorConfig>> {
    return apiClient.get<ConnectorConfig>(`/connectors/${connectorId}`);
  }

  async getConnectorEndpoints(connectorId: string): Promise<ApiResponse<ConnectorConfig['endpoints']>> {
    return apiClient.get<ConnectorConfig['endpoints']>(`/connectors/${connectorId}/endpoints`);
  }

  async getConnectorRequiredPermissions(connectorId: string): Promise<ApiResponse<string[]>> {
    return apiClient.get<string[]>(`/connectors/${connectorId}/required-permissions`);
  }

  async listConnections(): Promise<ApiResponse<ConnectorConnection[]>> {
    return apiClient.get<ConnectorConnection[]>('/connectors/connections');
  }

  async getConnection(connectionId: string): Promise<ApiResponse<ConnectorConnection>> {
    return apiClient.get<ConnectorConnection>(`/connectors/connections/${connectionId}`);
  }

  async createConnection(request: CreateConnectionRequest): Promise<ApiResponse<ConnectorConnection>> {
    return apiClient.post<ConnectorConnection>('/connectors/connections', request);
  }

  async updateConnection(connectionId: string, request: UpdateConnectionRequest): Promise<ApiResponse<ConnectorConnection>> {
    return apiClient.patch<ConnectorConnection>(`/connectors/connections/${connectionId}`, request);
  }

  async deleteConnection(connectionId: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/connectors/connections/${connectionId}`);
  }

  async testConnection(connectionId: string): Promise<ApiResponse<ConnectionTestResult>> {
    return apiClient.post<ConnectionTestResult>(`/connectors/connections/${connectionId}/test`);
  }

  async executeAction(connectionId: string, action: string, params: Record<string, unknown>): Promise<ApiResponse<ConnectorActionResult>> {
    return apiClient.post<ConnectorActionResult>(`/connectors/connections/${connectionId}/actions`, {
      action,
      params,
    });
  }

  async getConnectionPermissions(connectionId: string): Promise<ApiResponse<string[]>> {
    return apiClient.get<string[]>(`/connectors/connections/${connectionId}/permissions`);
  }

  async addPermission(connectionId: string, permission: string): Promise<ApiResponse<void>> {
    return apiClient.post<void>(`/connectors/connections/${connectionId}/permissions`, { permission });
  }

  async removePermission(connectionId: string, permission: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/connectors/connections/${connectionId}/permissions/${permission}`);
  }

  async initiateOAuth(request: ConnectorOAuthRequest): Promise<ApiResponse<ConnectorOAuthResponse>> {
    return apiClient.post<ConnectorOAuthResponse>('/connectors/oauth/authorize', request);
  }

  async handleOAuthCallback(request: ConnectorOAuthCallbackRequest): Promise<ApiResponse<{ userId: string; connectorId: string; tokenData: any }>> {
    return apiClient.post('/connectors/oauth/callback', request);
  }

  async refreshToken(connectorId: string): Promise<ApiResponse<any>> {
    return apiClient.post('/connectors/oauth/refresh', { connectorId });
  }

  async revokeOAuth(connectorId: string): Promise<ApiResponse<void>> {
    return apiClient.post('/connectors/oauth/revoke', { connectorId });
  }

  async getConnectorLogs(connectionId: string, params?: PaginationParams): Promise<ApiResponse<any>> {
    return apiClient.get(`/connectors/connections/${connectionId}/logs`, params);
  }

  async getConnectorMetrics(connectorId: string): Promise<ApiResponse<any>> {
    return apiClient.get(`/connectors/${connectorId}/metrics`);
  }
}

export const connectorServiceV2 = new ConnectorServiceV2();
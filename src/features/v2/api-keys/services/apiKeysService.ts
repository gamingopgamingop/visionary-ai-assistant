import { apiClient } from '../../shared/services/apiClient';
import { ApiResponse } from '../../shared/types';

export interface ApiKeyData {
  id: string;
  userId: string;
  name: string;
  prefix: string;
  keyHash: string;
  scopes: string[];
  expiresAt?: string;
  lastUsedAt?: string;
  revoked: boolean;
  revokedAt?: string;
  revokedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateApiKeyRequest {
  name: string;
  scopes: string[];
  expiresInDays?: number;
}

export interface CreateApiKeyResponse {
  id: string;
  name: string;
  prefix: string;
  key: string;
  scopes: string[];
  expiresAt?: string;
  createdAt: string;
}

export interface ApiKeyScope {
  name: string;
  description: string;
  resource: string;
  action: string;
}

export class ApiKeysServiceV2 {
  async listApiKeys(): Promise<ApiResponse<ApiKeyData[]>> {
    return apiClient.get<ApiKeyData[]>('/api-keys');
  }

  async getApiKey(keyId: string): Promise<ApiResponse<ApiKeyData>> {
    return apiClient.get<ApiKeyData>(`/api-keys/${keyId}`);
  }

  async createApiKey(request: CreateApiKeyRequest): Promise<ApiResponse<CreateApiKeyResponse>> {
    return apiClient.post<CreateApiKeyResponse>('/api-keys', request);
  }

  async revokeApiKey(keyId: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/api-keys/${keyId}`);
  }

  async revokeAllApiKeys(): Promise<ApiResponse<{ revoked: number }>> {
    return apiClient.post<{ revoked: number }>('/api-keys/revoke-all');
  }

  async rotateApiKey(keyId: string): Promise<ApiResponse<CreateApiKeyResponse>> {
    return apiClient.post<CreateApiKeyResponse>(`/api-keys/${keyId}/rotate`);
  }

  async updateApiKeyScopes(keyId: string, scopes: string[]): Promise<ApiResponse<void>> {
    return apiClient.patch<void>(`/api-keys/${keyId}/scopes`, { scopes });
  }

  async verifyApiKey(key: string): Promise<ApiResponse<{ valid: boolean; scopes: string[] }>> {
    return apiClient.post<{ valid: boolean; scopes: string[] }>('/api-keys/verify', { key });
  }

  async getAvailableScopes(): Promise<ApiResponse<ApiKeyScope[]>> {
    return apiClient.get<ApiKeyScope[]>('/api-keys/scopes');
  }
}

export const apiKeysServiceV2 = new ApiKeysServiceV2();

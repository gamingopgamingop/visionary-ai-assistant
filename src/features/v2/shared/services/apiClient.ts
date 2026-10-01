import { 
  ApiResponse, 
  PaginatedResponse, 
  PaginationParams, 
  FeatureFlags,
  ApiErrorResponse 
} from '../types';

const API_BASE = '/v2';

class ApiClient {
  private baseUrl: string;
  private defaultHeaders: HeadersInit;

  constructor(baseUrl: string = API_BASE) {
    this.baseUrl = baseUrl;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config: RequestInit = {
      ...options,
      headers: {
        ...this.defaultHeaders,
        ...options.headers,
      },
      credentials: 'include',
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        const errorResponse = data as ApiErrorResponse;
        throw {
          response: {
            status: response.status,
            data: errorResponse,
          },
          message: errorResponse.error?.message || `HTTP ${response.status}`,
        };
      }

      return data as ApiResponse<T>;
    } catch (error) {
      if (error && typeof error === 'object' && 'response' in error) {
        throw error;
      }
      throw {
        message: error instanceof Error ? error.message : 'Network error',
        response: {
          status: 0,
          data: { error: { code: 'NETWORK_ERROR', message: 'Network error' } },
        },
      };
    }
  }

  async get<T>(endpoint: string, params?: Record<string, unknown>): Promise<ApiResponse<T>> {
    const url = new URL(`${this.baseUrl}${endpoint}`, window.location.origin);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }
    return this.request<T>(url.pathname + url.search);
  }

  async post<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  async getPaginated<T>(
    endpoint: string, 
    params?: PaginationParams & Record<string, unknown>
  ): Promise<ApiResponse<PaginatedResponse<unknown>>> {
    const queryParams: Record<string, string> = {};
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams[key] = String(value);
        }
      });
    }
    
    return this.get<PaginatedResponse<unknown>>(endpoint, queryParams);
  }

  setAuthToken(token: string): void {
    this.defaultHeaders = {
      ...this.defaultHeaders,
      Authorization: `Bearer ${token}`,
    };
  }

  clearAuthToken(): void {
    const { Authorization, ...rest } = this.defaultHeaders as Record<string, string>;
    this.defaultHeaders = rest;
  }
}

export const apiClient = new ApiClient();

export function getFeatureFlags(): Promise<ApiResponse<FeatureFlags>> {
  return apiClient.get<FeatureFlags>('/features');
}

export async function checkV2Enabled(feature: string): Promise<boolean> {
  try {
    const response = await getFeatureFlags();
    if (response.success && response.data) {
      return response.data[feature] === true;
    }
  } catch {
    // Feature flags endpoint not available
  }
  return false;
}
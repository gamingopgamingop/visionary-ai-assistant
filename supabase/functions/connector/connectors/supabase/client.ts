import type { ConnectorConfig, ConnectorCredentials, ConnectorResult, ConnectionTestResult } from "../../../types.ts";
import { logger } from "../../../logger.ts";
import { AuthenticationError, NetworkError, RateLimitError, NotFoundError, ValidationError } from "../../../errors.ts";
import { rateLimiter } from "../../../core/rate-limiter.ts";

export interface SupabaseClientOptions {
  config: ConnectorConfig;
  credentials: ConnectorCredentials;
  baseUrl?: string;
  projectRef: string;
}

export class SupabaseClient {
  private config: ConnectorConfig;
  private credentials: ConnectorCredentials;
  private baseUrl: string;
  private projectRef: string;
  private apiKey: string;

  constructor(options: SupabaseClientOptions) {
    this.config = options.config;
    this.credentials = options.credentials;
    this.projectRef = options.projectRef;
    this.apiKey = this.credentials.apiKey || this.credentials.accessToken || "";
    this.baseUrl = options.baseUrl || `https://${this.projectRef}.supabase.co`;
  }

  private async request<T>(
    method: string,
    path: string,
    options: {
      params?: Record<string, unknown>;
      body?: unknown;
      headers?: Record<string, string>;
    } = {},
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);

    if (options.params) {
      for (const [key, value] of Object.entries(options.params)) {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      }
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      apikey: this.apiKey,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
      ...options.headers,
    };

    await rateLimiter.checkConnectorLimit("supabase", "supabase", this.config.rateLimits);

    const response = await fetch(url.toString(), {
      method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      let errorMessage = `Supabase API error: ${response.status} ${response.statusText}`;

      try {
        const errorJson = JSON.parse(errorBody);
        errorMessage = errorJson.message || errorJson.error || errorMessage;
      } catch {
        errorMessage = errorBody || errorMessage;
      }

      switch (response.status) {
        case 401:
          throw new AuthenticationError(errorMessage);
        case 403:
          throw new AuthenticationError(errorMessage);
        case 429:
          throw new RateLimitError(errorMessage);
        case 404:
          throw new NotFoundError("Resource", path);
        case 400:
          throw new ValidationError(errorMessage);
        default:
          throw new NetworkError(errorMessage);
      }
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  async get<T>(path: string, params?: Record<string, unknown>): Promise<T> {
    return this.request<T>("GET", path, { params });
  }

  async post<T>(path: string, body?: unknown, params?: Record<string, unknown>): Promise<T> {
    return this.request<T>("POST", path, { body, params });
  }

  async patch<T>(path: string, body?: unknown, params?: Record<string, unknown>): Promise<T> {
    return this.request<T>("PATCH", path, { body, params });
  }

  async delete<T>(path: string, params?: Record<string, unknown>): Promise<T> {
    return this.request<T>("DELETE", path, { params });
  }

  async testConnection(): Promise<ConnectionTestResult> {
    try {
      // Test with a simple query
      await this.get<any[]>("/rest/v1/", { select: "count", head: true, limit: 1 });
      return {
        success: true,
        message: `Connected to Supabase project ${this.projectRef}`,
        data: { projectRef: this.projectRef },
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Connection test failed",
      };
    }
  }
}

export function createSupabaseClient(config: ConnectorConfig, credentials: ConnectorCredentials, projectRef: string): SupabaseClient {
  return new SupabaseClient({ config, credentials, projectRef });
}
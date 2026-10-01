import type { ConnectorConfig, ConnectorCredentials, ConnectorResult, ConnectionTestResult } from "../../../types.ts";
import { logger } from "../../../logger.ts";
import { AuthenticationError, NetworkError, RateLimitError, NotFoundError, ValidationError } from "../../../errors.ts";
import { rateLimiter } from "../../../core/rate-limiter.ts";

export interface GoogleClientOptions {
  config: ConnectorConfig;
  credentials: ConnectorCredentials;
  baseUrl?: string;
}

export class GoogleClient {
  private config: ConnectorConfig;
  private credentials: ConnectorCredentials;
  private baseUrl: string;
  private accessToken: string;

  constructor(options: GoogleClientOptions) {
    this.config = options.config;
    this.credentials = options.credentials;
    this.baseUrl = options.baseUrl || this.config.baseUrl;
    this.accessToken = this.credentials.accessToken || "";
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
          if (Array.isArray(value)) {
            for (const v of value) {
              url.searchParams.append(key, String(v));
            }
          } else {
            url.searchParams.append(key, String(value));
          }
        }
      }
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.accessToken}`,
      "Content-Type": "application/json",
      ...options.headers,
    };

    await rateLimiter.checkConnectorLimit("google", "google", this.config.rateLimits);

    const response = await fetch(url.toString(), {
      method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      let errorMessage = `Google API error: ${response.status} ${response.statusText}`;

      try {
        const errorJson = JSON.parse(errorBody);
        errorMessage = errorJson.error?.message || errorMessage;
      } catch {
        errorMessage = errorBody || errorMessage;
      }

      switch (response.status) {
        case 401:
          throw new AuthenticationError(errorMessage);
        case 403:
          if (errorMessage.includes("rate limit") || errorMessage.includes("quota")) {
            throw new RateLimitError(errorMessage);
          }
          throw new AuthenticationError(errorMessage);
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

  async put<T>(path: string, body?: unknown, params?: Record<string, unknown>): Promise<T> {
    return this.request<T>("PUT", path, { body, params });
  }

  async delete<T>(path: string, params?: Record<string, unknown>): Promise<T> {
    return this.request<T>("DELETE", path, { params });
  }

  async testConnection(): Promise<ConnectionTestResult> {
    try {
      const user = await this.get<{ email: string; id: string; name: string }>("/oauth2/v2/userinfo");
      return {
        success: true,
        message: `Connected as ${user.email}`,
        data: { userId: user.id, email: user.email, name: user.name },
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Connection test failed",
      };
    }
  }

  // User Info
  async getUserInfo(): Promise<ConnectorResult> {
    try {
      const user = await this.get<any>("/oauth2/v2/userinfo");
      return { success: true, data: user };
    } catch (error) {
      return { success: false, error: error as any };
    }
  }
}

export function createGoogleClient(config: ConnectorConfig, credentials: ConnectorCredentials): GoogleClient {
  return new GoogleClient({ config, credentials });
}
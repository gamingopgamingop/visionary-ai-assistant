import type { ConnectorConfig, ConnectorCredentials, ConnectorResult, ConnectionTestResult } from "../../../types.ts";
import { logger } from "../../../logger.ts";
import { AuthenticationError, NetworkError, RateLimitError, NotFoundError, ValidationError } from "../../../errors.ts";
import { rateLimiter } from "../../../core/rate-limiter.ts";

export interface GenericClientOptions {
  config: ConnectorConfig;
  credentials: ConnectorCredentials;
  baseUrl?: string;
}

export class GenericClient {
  private config: ConnectorConfig;
  private credentials: ConnectorCredentials;
  private baseUrl: string;
  private apiKey: string;

  constructor(options: GenericClientOptions) {
    this.config = options.config;
    this.credentials = options.credentials;
    this.baseUrl = options.baseUrl || this.config.baseUrl;
    this.apiKey = this.credentials.apiKey || this.credentials.accessToken || "";
  }

  private buildHeaders(customHeaders?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...customHeaders,
    };

    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }

    return headers;
  }

  async request<T>(
    method: string,
    url: string,
    options: {
      headers?: Record<string, string>;
      body?: unknown;
      params?: Record<string, unknown>;
    } = {},
  ): Promise<T> {
    const requestUrl = new URL(url);

    if (options.params) {
      for (const [key, value] of Object.entries(options.params)) {
        if (value !== undefined && value !== null) {
          requestUrl.searchParams.append(key, String(value));
        }
      }
    }

    await rateLimiter.checkConnectorLimit("generic", "generic", this.config.rateLimits);

    const response = await fetch(requestUrl.toString(), {
      method,
      headers: this.buildHeaders(options.headers),
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      let errorMessage = `HTTP error: ${response.status} ${response.statusText}`;

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
          throw new NotFoundError("Resource", url);
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

  async get<T>(url: string, params?: Record<string, unknown>, headers?: Record<string, string>): Promise<T> {
    return this.request<T>("GET", url, { params, headers });
  }

  async post<T>(url: string, body?: unknown, params?: Record<string, unknown>, headers?: Record<string, string>): Promise<T> {
    return this.request<T>("POST", url, { body, params, headers });
  }

  async put<T>(url: string, body?: unknown, params?: Record<string, unknown>, headers?: Record<string, string>): Promise<T> {
    return this.request<T>("PUT", url, { body, params, headers });
  }

  async patch<T>(url: string, body?: unknown, params?: Record<string, unknown>, headers?: Record<string, string>): Promise<T> {
    return this.request<T>("PATCH", url, { body, params, headers });
  }

  async delete<T>(url: string, params?: Record<string, unknown>, headers?: Record<string, string>): Promise<T> {
    return this.request<T>("DELETE", url, { params, headers });
  }

  async testConnection(): Promise<ConnectionTestResult> {
    try {
      if (!this.baseUrl) {
        return {
          success: false,
          message: "No base URL configured for generic connector",
        };
      }
      const response = await fetch(this.baseUrl, { method: "HEAD" });
      return {
        success: response.ok,
        message: response.ok ? `Connected to ${this.baseUrl}` : `Connection failed: ${response.status}`,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Connection test failed",
      };
    }
  }
}

export function createGenericClient(config: ConnectorConfig, credentials: ConnectorCredentials, baseUrl?: string): GenericClient {
  return new GenericClient({ config, credentials, baseUrl });
}
import type { ConnectorConfig, ConnectorCredentials, ConnectorResult, ConnectionTestResult } from "../../../types.ts";
import { logger } from "../../../logger.ts";
import { AuthenticationError, NetworkError, RateLimitError, NotFoundError, ValidationError } from "../../../errors.ts";
import { rateLimiter } from "../../../core/rate-limiter.ts";

export interface SlackClientOptions {
  config: ConnectorConfig;
  credentials: ConnectorCredentials;
  baseUrl?: string;
}

export class SlackClient {
  private config: ConnectorConfig;
  private credentials: ConnectorCredentials;
  private baseUrl: string;
  private accessToken: string;

  constructor(options: SlackClientOptions) {
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
          url.searchParams.append(key, String(value));
        }
      }
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.accessToken}`,
      "Content-Type": "application/json",
      ...options.headers,
    };

    await rateLimiter.checkConnectorLimit("slack", "slack", this.config.rateLimits);

    const response = await fetch(url.toString(), {
      method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const data = await response.json();

    if (!data.ok) {
      let errorMessage = `Slack API error: ${data.error}`;

      switch (response.status) {
        case 401:
        case 403:
          throw new AuthenticationError(errorMessage);
        case 429:
          const retryAfter = response.headers.get("Retry-After");
          throw new RateLimitError(errorMessage, {
            resetAt: retryAfter ? Date.now() + parseInt(retryAfter) * 1000 : Date.now() + 60000,
            limit: 100,
            remaining: 0,
          });
        case 404:
          throw new NotFoundError("Resource", path);
        case 400:
          throw new ValidationError(errorMessage);
        default:
          throw new NetworkError(errorMessage);
      }
    }

    return data;
  }

  async get<T>(path: string, params?: Record<string, unknown>): Promise<T> {
    return this.request<T>("GET", path, { params });
  }

  async post<T>(path: string, body?: unknown, params?: Record<string, unknown>): Promise<T> {
    return this.request<T>("POST", path, { body, params });
  }

  async testConnection(): Promise<ConnectionTestResult> {
    try {
      const result = await this.post<{ user: string; team: string; team_id: string }>("/auth.test");
      return {
        success: true,
        message: `Connected as @${result.user} in ${result.team}`,
        data: { userId: result.user, teamId: result.team_id, teamName: result.team },
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Connection test failed",
      };
    }
  }
}

export function createSlackClient(config: ConnectorConfig, credentials: ConnectorCredentials): SlackClient {
  return new SlackClient({ config, credentials });
}
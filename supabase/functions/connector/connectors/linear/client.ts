import type { ConnectorConfig, ConnectorCredentials, ConnectorResult, ConnectionTestResult } from "../../../types.ts";
import { logger } from "../../../logger.ts";
import { AuthenticationError, NetworkError, RateLimitError, NotFoundError, ValidationError } from "../../../errors.ts";
import { rateLimiter } from "../../../core/rate-limiter.ts";

export interface LinearClientOptions {
  config: ConnectorConfig;
  credentials: ConnectorCredentials;
  baseUrl?: string;
}

export class LinearClient {
  private config: ConnectorConfig;
  private credentials: ConnectorCredentials;
  private baseUrl: string;
  private apiKey: string;

  constructor(options: LinearClientOptions) {
    this.config = options.config;
    this.credentials = options.credentials;
    this.baseUrl = options.baseUrl || this.config.baseUrl;
    this.apiKey = this.credentials.apiKey || "";
  }

  private async request<T>(
    query: string,
    variables?: Record<string, unknown>,
  ): Promise<T> {
    await rateLimiter.checkConnectorLimit("linear", "linear", this.config.rateLimits);

    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      let errorMessage = `Linear API error: ${response.status} ${response.statusText}`;

      try {
        const errorJson = JSON.parse(errorBody);
        errorMessage = errorJson.errors?.[0]?.message || errorMessage;
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
          throw new NotFoundError("Resource", "GraphQL");
        case 400:
          throw new ValidationError(errorMessage);
        default:
          throw new NetworkError(errorMessage);
      }
    }

    const result = await response.json();

    if (result.errors) {
      throw new Error(result.errors.map((e: any) => e.message).join(", "));
    }

    return result.data;
  }

  async testConnection(): Promise<ConnectionTestResult> {
    try {
      const query = `
        query {
          viewer {
            id
            name
            email
          }
        }
      `;
      const result = await this.request<{ viewer: { id: string; name: string; email: string } }>(query);
      return {
        success: true,
        message: `Connected as ${result.viewer.name} (${result.viewer.email})`,
        data: { userId: result.viewer.id, name: result.viewer.name, email: result.viewer.email },
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Connection test failed",
      };
    }
  }

  async executeQuery<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    return this.request<T>(query, variables);
  }
}

export function createLinearClient(config: ConnectorConfig, credentials: ConnectorCredentials): LinearClient {
  return new LinearClient({ config, credentials });
}
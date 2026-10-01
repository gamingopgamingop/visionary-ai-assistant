import type { ConnectorConfig, ConnectorCredentials, ConnectorResult, ConnectionTestResult } from "../../../types.ts";
import { Connector, logger } from "../../../logger.ts";
import { AuthenticationError, NetworkError, RateLimitError, NotFoundError, ValidationError } from "../../../errors.ts";
import { rateLimiter } from "../../../core/rate-limiter.ts";

export interface GitHubClientOptions {
  config: ConnectorConfig;
  credentials: ConnectorCredentials;
  baseUrl?: string;
}

export class GitHubClient {
  private config: ConnectorConfig;
  private credentials: ConnectorCredentials;
  private baseUrl: string;
  private accessToken: string;

  constructor(options: GitHubClientOptions) {
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
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${this.accessToken}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...options.headers,
    };

    if (options.body) {
      headers["Content-Type"] = "application/json";
    }

    await rateLimiter.checkConnectorLimit("github", "github", this.config.rateLimits);

    const response = await fetch(url.toString(), {
      method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const rateLimitRemaining = response.headers.get("X-RateLimit-Remaining");
    const rateLimitReset = response.headers.get("X-RateLimit-Reset");

    if (rateLimitRemaining !== null && parseInt(rateLimitRemaining) === 0) {
      throw new RateLimitError("GitHub rate limit exceeded", {
        resetAt: rateLimitReset ? parseInt(rateLimitReset) * 1000 : Date.now() + 3600000,
        limit: parseInt(response.headers.get("X-RateLimit-Limit") || "5000"),
        remaining: 0,
      });
    }

    if (!response.ok) {
      const errorBody = await response.text();
      let errorMessage = `GitHub API error: ${response.status} ${response.statusText}`;

      try {
        const errorJson = JSON.parse(errorBody);
        errorMessage = errorJson.message || errorMessage;
      } catch {
        errorMessage = errorBody || errorMessage;
      }

      switch (response.status) {
        case 401:
          throw new AuthenticationError(errorMessage);
        case 403:
          if (errorMessage.includes("rate limit")) {
            throw new RateLimitError(errorMessage);
          }
          throw new AuthenticationError(errorMessage);
        case 404:
          throw new NotFoundError("Resource", path);
        case 422:
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
      const user = await this.get<{ login: string; id: number }>("/user");
      return {
        success: true,
        message: `Connected as @${user.login}`,
        data: { userId: user.id, username: user.login },
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "Connection test failed",
      };
    }
  }

  // Repository methods
  async getRepositories(params?: {
    type?: "all" | "owner" | "member";
    sort?: "created" | "updated" | "pushed" | "full_name";
    direction?: "asc" | "desc";
    per_page?: number;
    page?: number;
  }): Promise<ConnectorResult> {
    try {
      const repos = await this.get<any[]>("/user/repos", params);
      return { success: true, data: repos };
    } catch (error) {
      return { success: false, error: error as any };
    }
  }

  async getRepository(owner: string, repo: string): Promise<ConnectorResult> {
    try {
      const repository = await this.get<any>(`/repos/${owner}/${repo}`);
      return { success: true, data: repository };
    } catch (error) {
      return { success: false, error: error as any };
    }
  }

  async createRepository(data: {
    name: string;
    description?: string;
    private?: boolean;
    auto_init?: boolean;
  }): Promise<ConnectorResult> {
    try {
      const repo = await this.post<any>("/user/repos", data);
      return { success: true, data: repo };
    } catch (error) {
      return { success: false, error: error as any };
    }
  }

  // Issue methods
  async getIssues(owner: string, repo: string, params?: {
    state?: "open" | "closed" | "all";
    labels?: string;
    sort?: "created" | "updated" | "comments";
    direction?: "asc" | "desc";
    per_page?: number;
    page?: number;
  }): Promise<ConnectorResult> {
    try {
      const issues = await this.get<any[]>(`/repos/${owner}/${repo}/issues`, params);
      return { success: true, data: issues };
    } catch (error) {
      return { success: false, error: error as any };
    }
  }

  async getIssue(owner: string, repo: string, issueNumber: number): Promise<ConnectorResult> {
    try {
      const issue = await this.get<any>(`/repos/${owner}/${repo}/issues/${issueNumber}`);
      return { success: true, data: issue };
    } catch (error) {
      return { success: false, error: error as any };
    }
  }

  async createIssue(owner: string, repo: string, data: {
    title: string;
    body?: string;
    assignees?: string[];
    labels?: string[];
  }): Promise<ConnectorResult> {
    try {
      const issue = await this.post<any>(`/repos/${owner}/${repo}/issues`, data);
      return { success: true, data: issue };
    } catch (error) {
      return { success: false, error: error as any };
    }
  }

  async updateIssue(owner: string, repo: string, issueNumber: number, data: {
    title?: string;
    body?: string;
    state?: "open" | "closed";
    assignees?: string[];
    labels?: string[];
  }): Promise<ConnectorResult> {
    try {
      const issue = await this.patch<any>(`/repos/${owner}/${repo}/issues/${issueNumber}`, data);
      return { success: true, data: issue };
    } catch (error) {
      return { success: false, error: error as any };
    }
  }

  // Pull Request methods
  async getPullRequests(owner: string, repo: string, params?: {
    state?: "open" | "closed" | "all";
    head?: string;
    base?: string;
    sort?: "created" | "updated" | "popularity" | "long-running";
    direction?: "asc" | "desc";
    per_page?: number;
    page?: number;
  }): Promise<ConnectorResult> {
    try {
      const prs = await this.get<any[]>(`/repos/${owner}/${repo}/pulls`, params);
      return { success: true, data: prs };
    } catch (error) {
      return { success: false, error: error as any };
    }
  }

  async getPullRequest(owner: string, repo: string, pullNumber: number): Promise<ConnectorResult> {
    try {
      const pr = await this.get<any>(`/repos/${owner}/${repo}/pulls/${pullNumber}`);
      return { success: true, data: pr };
    } catch (error) {
      return { success: false, error: error as any };
    }
  }

  async createPullRequest(owner: string, repo: string, data: {
    title: string;
    head: string;
    base: string;
    body?: string;
    draft?: boolean;
  }): Promise<ConnectorResult> {
    try {
      const pr = await this.post<any>(`/repos/${owner}/${repo}/pulls`, data);
      return { success: true, data: pr };
    } catch (error) {
      return { success: false, error: error as any };
    }
  }

  // Commit methods
  async getCommits(owner: string, repo: string, params?: {
    sha?: string;
    path?: string;
    author?: string;
    since?: string;
    until?: string;
    per_page?: number;
    page?: number;
  }): Promise<ConnectorResult> {
    try {
      const commits = await this.get<any[]>(`/repos/${owner}/${repo}/commits`, params);
      return { success: true, data: commits };
    } catch (error) {
      return { success: false, error: error as any };
    }
  }

  async getCommit(owner: string, repo: string, ref: string): Promise<ConnectorResult> {
    try {
      const commit = await this.get<any>(`/repos/${owner}/${repo}/commits/${ref}`);
      return { success: true, data: commit };
    } catch (error) {
      return { success: false, error: error as any };
    }
  }

  // Webhook methods
  async createWebhook(owner: string, repo: string, data: {
    name: "web";
    config: {
      url: string;
      content_type?: "json" | "form";
      secret?: string;
      insecure_ssl?: 0 | 1;
    };
    events?: string[];
    active?: boolean;
  }): Promise<ConnectorResult> {
    try {
      const webhook = await this.post<any>(`/repos/${owner}/${repo}/hooks`, data);
      return { success: true, data: webhook };
    } catch (error) {
      return { success: false, error: error as any };
    }
  }

  async getWebhooks(owner: string, repo: string): Promise<ConnectorResult> {
    try {
      const webhooks = await this.get<any[]>(`/repos/${owner}/${repo}/hooks`);
      return { success: true, data: webhooks };
    } catch (error) {
      return { success: false, error: error as any };
    }
  }

  async deleteWebhook(owner: string, repo: string, hookId: number): Promise<ConnectorResult> {
    try {
      await this.delete<void>(`/repos/${owner}/${repo}/hooks/${hookId}`);
      return { success: true, data: { deleted: true } };
    } catch (error) {
      return { success: false, error: error as any };
    }
  }
}

export function createGitHubClient(config: ConnectorConfig, credentials: ConnectorCredentials): GitHubClient {
  return new GitHubClient({ config, credentials });
}
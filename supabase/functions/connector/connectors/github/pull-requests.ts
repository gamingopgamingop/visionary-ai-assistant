import type { ConnectorResult } from "../../../../types.ts";
import { GitHubClient } from "../client.ts";

export const pullRequestsActions = {
  async list(client: GitHubClient, owner: string, repo: string, params?: {
    state?: "open" | "closed" | "all";
    head?: string;
    base?: string;
    sort?: "created" | "updated" | "popularity" | "long-running";
    direction?: "asc" | "desc";
    per_page?: number;
    page?: number;
  }): Promise<ConnectorResult> {
    return client.getPullRequests(owner, repo, params);
  },

  async get(client: GitHubClient, owner: string, repo: string, pullNumber: number): Promise<ConnectorResult> {
    return client.getPullRequest(owner, repo, pullNumber);
  },

  async create(client: GitHubClient, owner: string, repo: string, data: {
    title: string;
    head: string;
    base: string;
    body?: string;
    draft?: boolean;
  }): Promise<ConnectorResult> {
    return client.createPullRequest(owner, repo, data);
  },
};

export default pullRequestsActions;
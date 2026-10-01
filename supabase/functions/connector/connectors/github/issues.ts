import type { ConnectorResult } from "../../../../types.ts";
import { GitHubClient } from "../client.ts";

export const issuesActions = {
  async list(client: GitHubClient, owner: string, repo: string, params?: {
    state?: "open" | "closed" | "all";
    labels?: string;
    sort?: "created" | "updated" | "comments";
    direction?: "asc" | "desc";
    per_page?: number;
    page?: number;
  }): Promise<ConnectorResult> {
    return client.getIssues(owner, repo, params);
  },

  async get(client: GitHubClient, owner: string, repo: string, issueNumber: number): Promise<ConnectorResult> {
    return client.getIssue(owner, repo, issueNumber);
  },

  async create(client: GitHubClient, owner: string, repo: string, data: {
    title: string;
    body?: string;
    assignees?: string[];
    labels?: string[];
  }): Promise<ConnectorResult> {
    return client.createIssue(owner, repo, data);
  },

  async update(client: GitHubClient, owner: string, repo: string, issueNumber: number, data: {
    title?: string;
    body?: string;
    state?: "open" | "closed";
    assignees?: string[];
    labels?: string[];
  }): Promise<ConnectorResult> {
    return client.updateIssue(owner, repo, issueNumber, data);
  },
};

export default issuesActions;
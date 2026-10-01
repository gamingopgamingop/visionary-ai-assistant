import type { ConnectorResult } from "../../../../types.ts";
import { GitHubClient } from "../client.ts";

export const commitsActions = {
  async list(client: GitHubClient, owner: string, repo: string, params?: {
    sha?: string;
    path?: string;
    author?: string;
    since?: string;
    until?: string;
    per_page?: number;
    page?: number;
  }): Promise<ConnectorResult> {
    return client.getCommits(owner, repo, params);
  },

  async get(client: GitHubClient, owner: string, repo: string, ref: string): Promise<ConnectorResult> {
    return client.getCommit(owner, repo, ref);
  },
};

export default commitsActions;
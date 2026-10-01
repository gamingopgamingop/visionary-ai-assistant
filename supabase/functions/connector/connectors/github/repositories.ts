import type { ConnectorResult } from "../../../../types.ts";
import { GitHubClient } from "../client.ts";

export const repositoriesActions = {
  async list(client: GitHubClient, params?: {
    type?: "all" | "owner" | "member";
    sort?: "created" | "updated" | "pushed" | "full_name";
    direction?: "asc" | "desc";
    per_page?: number;
    page?: number;
  }): Promise<ConnectorResult> {
    return client.getRepositories(params);
  },

  async get(client: GitHubClient, owner: string, repo: string): Promise<ConnectorResult> {
    return client.getRepository(owner, repo);
  },

  async create(client: GitHubClient, data: {
    name: string;
    description?: string;
    private?: boolean;
    auto_init?: boolean;
  }): Promise<ConnectorResult> {
    return client.createRepository(data);
  },
};

export default repositoriesActions;
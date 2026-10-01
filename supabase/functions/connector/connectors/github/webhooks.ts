import type { ConnectorResult } from "../../../../types.ts";
import { GitHubClient } from "../client.ts";

export const webhooksActions = {
  async list(client: GitHubClient, owner: string, repo: string): Promise<ConnectorResult> {
    return client.getWebhooks(owner, repo);
  },

  async create(client: GitHubClient, owner: string, repo: string, data: {
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
    return client.createWebhook(owner, repo, data);
  },

  async delete(client: GitHubClient, owner: string, repo: string, hookId: number): Promise<ConnectorResult> {
    return client.deleteWebhook(owner, repo, hookId);
  },
};

export default webhooksActions;
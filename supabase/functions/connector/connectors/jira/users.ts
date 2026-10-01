import type { ConnectorResult } from "../../../../types.ts";
import { JiraClient } from "../client.ts";

export const usersActions = {
  async getUser(client: JiraClient, accountId: string): Promise<ConnectorResult> {
    try {
      const user = await client.get<any>("/user", { accountId });
      return { success: true, data: user };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async search(client: JiraClient, query: string, maxResults: number = 50): Promise<ConnectorResult> {
    try {
      const users = await client.get<any[]>("/user/search", { query, maxResults });
      return { success: true, data: users };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async getAssignableUsers(client: JiraClient, projectKey: string, query?: string): Promise<ConnectorResult> {
    try {
      const params: Record<string, unknown> = { project: projectKey };
      if (query) params.query = query;
      const users = await client.get<any[]>("/user/assignable/search", params);
      return { success: true, data: users };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },
};

export default usersActions;
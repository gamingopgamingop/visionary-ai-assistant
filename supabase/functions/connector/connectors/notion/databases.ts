import type { ConnectorResult } from "../../../../types.ts";
import { NotionClient } from "../client.ts";

export const databasesActions = {
  async getDatabase(client: NotionClient, databaseId: string): Promise<ConnectorResult> {
    try {
      const database = await client.get<any>(`/databases/${databaseId}`);
      return { success: true, data: database };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async queryDatabase(client: NotionClient, databaseId: string, data?: {
    filter?: Record<string, unknown>;
    sorts?: Array<{ property: string; direction: "ascending" | "descending" }>;
    start_cursor?: string;
    page_size?: number;
  }): Promise<ConnectorResult> {
    try {
      const result = await client.post<any>(`/databases/${databaseId}/query`, data || {});
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async createDatabase(client: NotionClient, data: {
    parent: { page_id: string };
    title: Array<{ type: "text"; text: { content: string } }>;
    properties: Record<string, unknown>;
  }): Promise<ConnectorResult> {
    try {
      const database = await client.post<any>("/databases", data);
      return { success: true, data: database };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async updateDatabase(client: NotionClient, databaseId: string, data: {
    title?: Array<{ type: "text"; text: { content: string } }>;
    properties?: Record<string, unknown>;
  }): Promise<ConnectorResult> {
    try {
      const database = await client.patch<any>(`/databases/${databaseId}`, data);
      return { success: true, data: database };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async listDatabases(client: NotionClient, params?: {
    start_cursor?: string;
    page_size?: number;
  }): Promise<ConnectorResult> {
    try {
      const result = await client.get<any>("/databases", params);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },
};

export default databasesActions;
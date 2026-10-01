import type { ConnectorResult } from "../../../../types.ts";
import { NotionClient } from "../client.ts";

export const searchActions = {
  async search(client: NotionClient, data?: {
    query?: string;
    filter?: { property: "object"; value: "page" | "database" };
    sort?: { direction: "ascending" | "descending"; timestamp: "last_edited_time" };
    start_cursor?: string;
    page_size?: number;
  }): Promise<ConnectorResult> {
    try {
      const result = await client.post<any>("/search", data || {});
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async searchPages(client: NotionClient, query: string, params?: {
    start_cursor?: string;
    page_size?: number;
  }): Promise<ConnectorResult> {
    return this.search(client, {
      query,
      filter: { property: "object", value: "page" },
      ...params,
    });
  },

  async searchDatabases(client: NotionClient, query: string, params?: {
    start_cursor?: string;
    page_size?: number;
  }): Promise<ConnectorResult> {
    return this.search(client, {
      query,
      filter: { property: "object", value: "database" },
      ...params,
    });
  },
};

export default searchActions;
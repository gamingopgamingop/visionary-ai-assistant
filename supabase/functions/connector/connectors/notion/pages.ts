import type { ConnectorResult } from "../../../../types.ts";
import { NotionClient } from "../client.ts";

export const pagesActions = {
  async getPage(client: NotionClient, pageId: string): Promise<ConnectorResult> {
    try {
      const page = await client.get<any>(`/pages/${pageId}`);
      return { success: true, data: page };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async createPage(client: NotionClient, data: {
    parent: { database_id?: string; page_id?: string; workspace?: boolean };
    properties: Record<string, unknown>;
    children?: unknown[];
    icon?: { type: "emoji" | "file"; emoji?: string; file?: { url: string } };
    cover?: { type: "file"; file: { url: string } };
  }): Promise<ConnectorResult> {
    try {
      const page = await client.post<any>("/pages", data);
      return { success: true, data: page };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async updatePage(client: NotionClient, pageId: string, data: {
    properties?: Record<string, unknown>;
    archived?: boolean;
    icon?: { type: "emoji" | "file"; emoji?: string; file?: { url: string } };
    cover?: { type: "file"; file: { url: string } };
  }): Promise<ConnectorResult> {
    try {
      const page = await client.patch<any>(`/pages/${pageId}`, data);
      return { success: true, data: page };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async getPageChildren(client: NotionClient, blockId: string, params?: {
    start_cursor?: string;
    page_size?: number;
  }): Promise<ConnectorResult> {
    try {
      const result = await client.get<any>(`/blocks/${blockId}/children`, params);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async appendBlockChildren(client: NotionClient, blockId: string, children: unknown[]): Promise<ConnectorResult> {
    try {
      const result = await client.patch<any>(`/blocks/${blockId}/children`, { children });
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async deleteBlock(client: NotionClient, blockId: string): Promise<ConnectorResult> {
    try {
      await client.patch<any>(`/blocks/${blockId}`, { archived: true });
      return { success: true, data: { deleted: true, blockId } };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },
};

export default pagesActions;
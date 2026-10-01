import type { ConnectorResult } from "../../../../types.ts";
import { MicrosoftClient } from "../client.ts";

export const oneDriveActions = {
  async listItems(client: MicrosoftClient, params?: {
    $top?: number;
    $skip?: number;
    $filter?: string;
    $orderby?: string;
  }): Promise<ConnectorResult> {
    try {
      const result = await client.get<any>("/me/drive/root/children", params);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async getItem(client: MicrosoftClient, itemId: string): Promise<ConnectorResult> {
    try {
      const item = await client.get<any>(`/me/drive/items/${itemId}`);
      return { success: true, data: item };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async createFolder(client: MicrosoftClient, parentId: string, name: string): Promise<ConnectorResult> {
    try {
      const folder = await client.post<any>(`/me/drive/items/${parentId}/children`, {
        name,
        folder: {},
        "@microsoft.graph.conflictBehavior": "rename",
      });
      return { success: true, data: folder };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async uploadFile(client: MicrosoftClient, parentId: string, name: string, content: string): Promise<ConnectorResult> {
    try {
      const uploadUrl = await client.put<any>(`/me/drive/items/${parentId}:/${name}:/content`, content, {
        headers: { "Content-Type": "application/octet-stream" },
      });
      return { success: true, data: uploadUrl };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async updateItem(client: MicrosoftClient, itemId: string, data: Record<string, unknown>): Promise<ConnectorResult> {
    try {
      const item = await client.patch<any>(`/me/drive/items/${itemId}`, data);
      return { success: true, data: item };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async deleteItem(client: MicrosoftClient, itemId: string): Promise<ConnectorResult> {
    try {
      await client.delete<void>(`/me/drive/items/${itemId}`);
      return { success: true, data: { deleted: true, itemId } };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async copyItem(client: MicrosoftClient, itemId: string, parentId: string, name?: string): Promise<ConnectorResult> {
    try {
      const item = await client.post<any>(`/me/drive/items/${itemId}/copy`, {
        parentReference: { id: parentId },
        name,
      });
      return { success: true, data: item };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async moveItem(client: MicrosoftClient, itemId: string, parentId: string, name?: string): Promise<ConnectorResult> {
    try {
      const item = await client.patch<any>(`/me/drive/items/${itemId}`, {
        parentReference: { id: parentId },
        name,
      });
      return { success: true, data: item };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async getDriveInfo(client: MicrosoftClient): Promise<ConnectorResult> {
    try {
      const drive = await client.get<any>("/me/drive");
      return { success: true, data: drive };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async searchItems(client: MicrosoftClient, query: string): Promise<ConnectorResult> {
    try {
      const result = await client.get<any>(`/me/drive/root/search(q='${encodeURIComponent(query)}')`);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },
};

export default oneDriveActions;
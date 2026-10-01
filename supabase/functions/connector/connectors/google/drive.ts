import type { ConnectorResult } from "../../../../types.ts";
import { GoogleClient } from "../client.ts";

export const driveActions = {
  async listFiles(client: GoogleClient, params?: {
    q?: string;
    pageSize?: number;
    pageToken?: string;
    orderBy?: string;
    fields?: string;
  }): Promise<ConnectorResult> {
    try {
      const result = await client.get<any>("/drive/v3/files", params);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async getFile(client: GoogleClient, fileId: string, fields?: string): Promise<ConnectorResult> {
    try {
      const file = await client.get<any>(`/drive/v3/files/${fileId}`, { fields });
      return { success: true, data: file };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async createFile(client: GoogleClient, data: {
    name: string;
    mimeType?: string;
    parents?: string[];
  }): Promise<ConnectorResult> {
    try {
      const file = await client.post<any>("/drive/v3/files", data);
      return { success: true, data: file };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async updateFile(client: GoogleClient, fileId: string, data: Record<string, unknown>): Promise<ConnectorResult> {
    try {
      const file = await client.patch<any>(`/drive/v3/files/${fileId}`, data);
      return { success: true, data: file };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async deleteFile(client: GoogleClient, fileId: string): Promise<ConnectorResult> {
    try {
      await client.delete<void>(`/drive/v3/files/${fileId}`);
      return { success: true, data: { deleted: true, fileId } };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async copyFile(client: GoogleClient, fileId: string, data: { name?: string; parents?: string[] }): Promise<ConnectorResult> {
    try {
      const file = await client.post<any>(`/drive/v3/files/${fileId}/copy`, data);
      return { success: true, data: file };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async createFolder(client: GoogleClient, name: string, parents?: string[]): Promise<ConnectorResult> {
    return this.createFile(client, {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents,
    });
  },

  async getFilePermissions(client: GoogleClient, fileId: string): Promise<ConnectorResult> {
    try {
      const result = await client.get<any>(`/drive/v3/files/${fileId}/permissions`);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async createPermission(client: GoogleClient, fileId: string, data: {
    role: "owner" | "organizer" | "fileOrganizer" | "writer" | "commenter" | "reader";
    type: "user" | "group" | "domain" | "anyone";
    emailAddress?: string;
    domain?: string;
    allowFileDiscovery?: boolean;
  }): Promise<ConnectorResult> {
    try {
      const permission = await client.post<any>(`/drive/v3/files/${fileId}/permissions`, data);
      return { success: true, data: permission };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },
};

export default driveActions;
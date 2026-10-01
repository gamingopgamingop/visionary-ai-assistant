import type { ConnectorResult } from "../../../../types.ts";
import { GoogleClient } from "../client.ts";

export const gmailActions = {
  async listMessages(client: GoogleClient, params?: {
    q?: string;
    labelIds?: string;
    maxResults?: number;
    pageToken?: string;
  }): Promise<ConnectorResult> {
    try {
      const result = await client.get<any>("/gmail/v1/users/me/messages", params);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async getMessage(client: GoogleClient, id: string, format?: "full" | "metadata" | "minimal" | "raw"): Promise<ConnectorResult> {
    try {
      const message = await client.get<any>(`/gmail/v1/users/me/messages/${id}`, { format });
      return { success: true, data: message };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async sendMessage(client: GoogleClient, rawMessage: string): Promise<ConnectorResult> {
    try {
      const result = await client.post<any>("/gmail/v1/users/me/messages/send", { raw: rawMessage });
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async createDraft(client: GoogleClient, rawMessage: string): Promise<ConnectorResult> {
    try {
      const result = await client.post<any>("/gmail/v1/users/me/drafts", { message: { raw: rawMessage } });
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async listLabels(client: GoogleClient): Promise<ConnectorResult> {
    try {
      const result = await client.get<any>("/gmail/v1/users/me/labels");
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async getProfile(client: GoogleClient): Promise<ConnectorResult> {
    try {
      const profile = await client.get<any>("/gmail/v1/users/me/profile");
      return { success: true, data: profile };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },
};

export default gmailActions;
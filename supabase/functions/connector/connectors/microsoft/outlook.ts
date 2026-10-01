import type { ConnectorResult } from "../../../../types.ts";
import { MicrosoftClient } from "../client.ts";

export const outlookActions = {
  async listMessages(client: MicrosoftClient, params?: {
    $top?: number;
    $skip?: number;
    $filter?: string;
    $orderby?: string;
    $select?: string;
  }): Promise<ConnectorResult> {
    try {
      const result = await client.get<any>("/me/messages", params);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async getMessage(client: MicrosoftClient, id: string): Promise<ConnectorResult> {
    try {
      const message = await client.get<any>(`/me/messages/${id}`);
      return { success: true, data: message };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async sendMessage(client: MicrosoftClient, message: {
    subject: string;
    body: { contentType: "text" | "html"; content: string };
    toRecipients: Array<{ emailAddress: { address: string; name?: string } }>;
    ccRecipients?: Array<{ emailAddress: { address: string; name?: string } }>;
    bccRecipients?: Array<{ emailAddress: { address: string; name?: string } }>;
    attachments?: Array<{ "@odata.type": "#microsoft.graph.fileAttachment"; name: string; contentBytes: string }>;
  }): Promise<ConnectorResult> {
    try {
      await client.post<any>("/me/sendMail", { message, saveToSentItems: true });
      return { success: true, data: { sent: true } };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async createDraft(client: MicrosoftClient, message: {
    subject: string;
    body: { contentType: "text" | "html"; content: string };
    toRecipients?: Array<{ emailAddress: { address: string; name?: string } }>;
    ccRecipients?: Array<{ emailAddress: { address: string; name?: string } }>;
    bccRecipients?: Array<{ emailAddress: { address: string; name?: string } }>;
  }): Promise<ConnectorResult> {
    try {
      const draft = await client.post<any>("/me/messages", message);
      return { success: true, data: draft };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async listFolders(client: MicrosoftClient): Promise<ConnectorResult> {
    try {
      const result = await client.get<any>("/me/mailFolders");
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async getFolder(client: MicrosoftClient, folderId: string): Promise<ConnectorResult> {
    try {
      const folder = await client.get<any>(`/me/mailFolders/${folderId}`);
      return { success: true, data: folder };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },
};

export default outlookActions;
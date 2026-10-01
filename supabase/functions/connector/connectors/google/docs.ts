import type { ConnectorResult } from "../../../../types.ts";
import { GoogleClient } from "../client.ts";

export const docsActions = {
  async getDocument(client: GoogleClient, documentId: string): Promise<ConnectorResult> {
    try {
      const document = await client.get<any>(`/docs/v1/documents/${documentId}`);
      return { success: true, data: document };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async createDocument(client: GoogleClient, title: string): Promise<ConnectorResult> {
    try {
      const document = await client.post<any>("/docs/v1/documents", { title });
      return { success: true, data: document };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async batchUpdate(client: GoogleClient, documentId: string, requests: Array<Record<string, unknown>>): Promise<ConnectorResult> {
    try {
      const result = await client.post<any>(`/docs/v1/documents/${documentId}:batchUpdate`, { requests });
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async insertText(client: GoogleClient, documentId: string, text: string, location?: { index: number }): Promise<ConnectorResult> {
    const requests = [{
      insertText: {
        text,
        location: location || { index: 1 },
      },
    }];
    return this.batchUpdate(client, documentId, requests);
  },

  async deleteContentRange(client: GoogleClient, documentId: string, range: { startIndex: number; endIndex: number }): Promise<ConnectorResult> {
    const requests = [{
      deleteContentRange: { range },
    }];
    return this.batchUpdate(client, documentId, requests);
  },

  async replaceAllText(client: GoogleClient, documentId: string, replaceText: string, containsText: string, matchCase: boolean = false): Promise<ConnectorResult> {
    const requests = [{
      replaceAllText: {
        containsText: { text: containsText, matchCase },
        replaceText,
      },
    }];
    return this.batchUpdate(client, documentId, requests);
  },

  async createNamedRange(client: GoogleClient, documentId: string, name: string, range: { startIndex: number; endIndex: number }): Promise<ConnectorResult> {
    const requests = [{
      createNamedRange: {
        name,
        range,
      },
    }];
    return this.batchUpdate(client, documentId, requests);
  },

  async updateParagraphStyle(client: GoogleClient, documentId: string, range: { startIndex: number; endIndex: number }, style: Record<string, unknown>): Promise<ConnectorResult> {
    const requests = [{
      updateParagraphStyle: {
        range,
        paragraphStyle: style,
        fields: Object.keys(style).join(","),
      },
    }];
    return this.batchUpdate(client, documentId, requests);
  },

  async updateTextStyle(client: GoogleClient, documentId: string, range: { startIndex: number; endIndex: number }, style: Record<string, unknown>): Promise<ConnectorResult> {
    const requests = [{
      updateTextStyle: {
        range,
        textStyle: style,
        fields: Object.keys(style).join(","),
      },
    }];
    return this.batchUpdate(client, documentId, requests);
  },
};

export default docsActions;
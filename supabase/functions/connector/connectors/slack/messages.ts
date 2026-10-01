import type { ConnectorResult } from "../../../../types.ts";
import { SlackClient } from "../client.ts";

export const messagesActions = {
  async postMessage(client: SlackClient, data: {
    channel: string;
    text?: string;
    blocks?: unknown[];
    attachments?: unknown[];
    thread_ts?: string;
    reply_broadcast?: boolean;
  }): Promise<ConnectorResult> {
    try {
      const result = await client.post<any>("/chat.postMessage", data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async updateMessage(client: SlackClient, data: {
    channel: string;
    ts: string;
    text?: string;
    blocks?: unknown[];
  }): Promise<ConnectorResult> {
    try {
      const result = await client.post<any>("/chat.update", data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async deleteMessage(client: SlackClient, channel: string, ts: string): Promise<ConnectorResult> {
    try {
      const result = await client.post<any>("/chat.delete", { channel, ts });
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async getHistory(client: SlackClient, channel: string, params?: {
    cursor?: string;
    limit?: number;
    latest?: string;
    oldest?: string;
    inclusive?: boolean;
  }): Promise<ConnectorResult> {
    try {
      const result = await client.get<any>("/conversations.history", { channel, ...params });
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async getReplies(client: SlackClient, channel: string, ts: string, params?: {
    cursor?: string;
    limit?: number;
  }): Promise<ConnectorResult> {
    try {
      const result = await client.get<any>("/conversations.replies", { channel, ts, ...params });
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async addReaction(client: SlackClient, channel: string, timestamp: string, name: string): Promise<ConnectorResult> {
    try {
      const result = await client.post<any>("/reactions.add", { channel, timestamp, name });
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async removeReaction(client: SlackClient, channel: string, timestamp: string, name: string): Promise<ConnectorResult> {
    try {
      const result = await client.post<any>("/reactions.remove", { channel, timestamp, name });
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async listReactions(client: SlackClient, params?: {
    channel?: string;
    timestamp?: string;
    cursor?: string;
    limit?: number;
  }): Promise<ConnectorResult> {
    try {
      const result = await client.get<any>("/reactions.list", params);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },
};

export default messagesActions;
import type { ConnectorResult } from "../../../../types.ts";
import { DiscordClient } from "../client.ts";

export const messagesActions = {
  async createMessage(client: DiscordClient, channelId: string, data: {
    content?: string;
    embeds?: unknown[];
    components?: unknown[];
    tts?: boolean;
    allowed_mentions?: Record<string, unknown>;
    message_reference?: Record<string, unknown>;
  }): Promise<ConnectorResult> {
    try {
      const message = await client.post<any>(`/channels/${channelId}/messages`, data);
      return { success: true, data: message };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async getMessages(client: DiscordClient, channelId: string, params?: {
    limit?: number;
    before?: string;
    after?: string;
    around?: string;
  }): Promise<ConnectorResult> {
    try {
      const messages = await client.get<any[]>(`/channels/${channelId}/messages`, params);
      return { success: true, data: messages };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async getMessage(client: DiscordClient, channelId: string, messageId: string): Promise<ConnectorResult> {
    try {
      const message = await client.get<any>(`/channels/${channelId}/messages/${messageId}`);
      return { success: true, data: message };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async updateMessage(client: DiscordClient, channelId: string, messageId: string, data: {
    content?: string;
    embeds?: unknown[];
    components?: unknown[];
    allowed_mentions?: Record<string, unknown>;
  }): Promise<ConnectorResult> {
    try {
      const message = await client.patch<any>(`/channels/${channelId}/messages/${messageId}`, data);
      return { success: true, data: message };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async deleteMessage(client: DiscordClient, channelId: string, messageId: string): Promise<ConnectorResult> {
    try {
      await client.delete<void>(`/channels/${channelId}/messages/${messageId}`);
      return { success: true, data: { deleted: true, messageId } };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async addReaction(client: DiscordClient, channelId: string, messageId: string, emoji: string): Promise<ConnectorResult> {
    try {
      await client.put<void>(`/channels/${channelId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}/@me`);
      return { success: true, data: { reacted: true } };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async removeReaction(client: DiscordClient, channelId: string, messageId: string, emoji: string): Promise<ConnectorResult> {
    try {
      await client.delete<void>(`/channels/${channelId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}/@me`);
      return { success: true, data: { removed: true } };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },
};

export default messagesActions;
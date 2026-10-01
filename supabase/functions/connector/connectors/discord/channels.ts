import type { ConnectorResult } from "../../../../types.ts";
import { DiscordClient } from "../client.ts";

export const channelsActions = {
  async getChannel(client: DiscordClient, channelId: string): Promise<ConnectorResult> {
    try {
      const channel = await client.get<any>(`/channels/${channelId}`);
      return { success: true, data: channel };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async modifyChannel(client: DiscordClient, channelId: string, data: {
    name?: string;
    type?: number;
    topic?: string;
    bitrate?: number;
    user_limit?: number;
    rate_limit_per_user?: number;
    position?: number;
    permission_overwrites?: unknown[];
    parent_id?: string;
    nsfw?: boolean;
  }): Promise<ConnectorResult> {
    try {
      const channel = await client.patch<any>(`/channels/${channelId}`, data);
      return { success: true, data: channel };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async deleteChannel(client: DiscordClient, channelId: string): Promise<ConnectorResult> {
    try {
      await client.delete<void>(`/channels/${channelId}`);
      return { success: true, data: { deleted: true, channelId } };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async getGuildChannels(client: DiscordClient, guildId: string): Promise<ConnectorResult> {
    try {
      const channels = await client.get<any[]>(`/guilds/${guildId}/channels`);
      return { success: true, data: channels };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async createGuildChannel(client: DiscordClient, guildId: string, data: {
    name: string;
    type?: number;
    topic?: string;
    bitrate?: number;
    user_limit?: number;
    rate_limit_per_user?: number;
    position?: number;
    permission_overwrites?: unknown[];
    parent_id?: string;
    nsfw?: boolean;
  }): Promise<ConnectorResult> {
    try {
      const channel = await client.post<any>(`/guilds/${guildId}/channels`, data);
      return { success: true, data: channel };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async getChannelMessages(client: DiscordClient, channelId: string, params?: {
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
};

export default channelsActions;
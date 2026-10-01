import type { ConnectorResult } from "../../../../types.ts";
import { DiscordClient } from "../client.ts";

export const serversActions = {
  async getCurrentUserGuilds(client: DiscordClient, params?: {
    limit?: number;
    before?: string;
    after?: string;
  }): Promise<ConnectorResult> {
    try {
      const guilds = await client.get<any[]>("/users/@me/guilds", params);
      return { success: true, data: guilds };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async getGuild(client: DiscordClient, guildId: string): Promise<ConnectorResult> {
    try {
      const guild = await client.get<any>(`/guilds/${guildId}`);
      return { success: true, data: guild };
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

  async getGuildMembers(client: DiscordClient, guildId: string, params?: {
    limit?: number;
    after?: string;
  }): Promise<ConnectorResult> {
    try {
      const members = await client.get<any[]>(`/guilds/${guildId}/members`, params);
      return { success: true, data: members };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async getGuildMember(client: DiscordClient, guildId: string, userId: string): Promise<ConnectorResult> {
    try {
      const member = await client.get<any>(`/guilds/${guildId}/members/${userId}`);
      return { success: true, data: member };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async addGuildMember(client: DiscordClient, guildId: string, userId: string, data: {
    access_token: string;
    nick?: string;
    roles?: string[];
    mute?: boolean;
    deaf?: boolean;
  }): Promise<ConnectorResult> {
    try {
      const member = await client.put<any>(`/guilds/${guildId}/members/${userId}`, data);
      return { success: true, data: member };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async modifyGuildMember(client: DiscordClient, guildId: string, userId: string, data: {
    nick?: string;
    roles?: string[];
    mute?: boolean;
    deaf?: boolean;
    channel_id?: string | null;
  }): Promise<ConnectorResult> {
    try {
      const member = await client.patch<any>(`/guilds/${guildId}/members/${userId}`, data);
      return { success: true, data: member };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async removeGuildMember(client: DiscordClient, guildId: string, userId: string): Promise<ConnectorResult> {
    try {
      await client.delete<void>(`/guilds/${guildId}/members/${userId}`);
      return { success: true, data: { removed: true, userId } };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },
};

export default serversActions;
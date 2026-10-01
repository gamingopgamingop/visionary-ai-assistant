import type { ConnectorResult } from "../../../../types.ts";
import { SlackClient } from "../client.ts";

export const channelsActions = {
  async list(client: SlackClient, params?: {
    cursor?: string;
    exclude_archived?: boolean;
    limit?: number;
    types?: string;
  }): Promise<ConnectorResult> {
    try {
      const result = await client.get<any>("/conversations.list", params);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async create(client: SlackClient, name: string, isPrivate: boolean = false): Promise<ConnectorResult> {
    try {
      const result = await client.post<any>("/conversations.create", { name, is_private: isPrivate });
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async info(client: SlackClient, channel: string, includeLocale: boolean = false): Promise<ConnectorResult> {
    try {
      const result = await client.get<any>("/conversations.info", { channel, include_locale: includeLocale });
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async join(client: SlackClient, channel: string): Promise<ConnectorResult> {
    try {
      const result = await client.post<any>("/conversations.join", { channel });
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async leave(client: SlackClient, channel: string): Promise<ConnectorResult> {
    try {
      const result = await client.post<any>("/conversations.leave", { channel });
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async archive(client: SlackClient, channel: string): Promise<ConnectorResult> {
    try {
      const result = await client.post<any>("/conversations.archive", { channel });
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async unarchive(client: SlackClient, channel: string): Promise<ConnectorResult> {
    try {
      const result = await client.post<any>("/conversations.unarchive", { channel });
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async rename(client: SlackClient, channel: string, name: string): Promise<ConnectorResult> {
    try {
      const result = await client.post<any>("/conversations.rename", { channel, name });
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async getMembers(client: SlackClient, channel: string, params?: {
    cursor?: string;
    limit?: number;
  }): Promise<ConnectorResult> {
    try {
      const result = await client.get<any>("/conversations.members", { channel, ...params });
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async inviteUsers(client: SlackClient, channel: string, users: string[]): Promise<ConnectorResult> {
    try {
      const result = await client.post<any>("/conversations.invite", { channel, users: users.join(",") });
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async kickUser(client: SlackClient, channel: string, user: string): Promise<ConnectorResult> {
    try {
      const result = await client.post<any>("/conversations.kick", { channel, user });
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },
};

export default channelsActions;
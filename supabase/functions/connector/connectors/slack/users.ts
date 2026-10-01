import type { ConnectorResult } from "../../../../types.ts";
import { SlackClient } from "../client.ts";

export const usersActions = {
  async list(client: SlackClient, params?: {
    cursor?: string;
    limit?: number;
    include_locale?: boolean;
  }): Promise<ConnectorResult> {
    try {
      const result = await client.get<any>("/users.list", params);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async info(client: SlackClient, user: string, includeLocale: boolean = false): Promise<ConnectorResult> {
    try {
      const result = await client.get<any>("/users.info", { user, include_locale: includeLocale });
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async getPresence(client: SlackClient, user: string): Promise<ConnectorResult> {
    try {
      const result = await client.get<any>("/users.getPresence", { user });
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async setPresence(client: SlackClient, presence: "auto" | "away"): Promise<ConnectorResult> {
    try {
      const result = await client.post<any>("/users.setPresence", { presence });
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async setStatus(client: SlackClient, profile: {
    status_text?: string;
    status_emoji?: string;
    status_expiration?: number;
  }): Promise<ConnectorResult> {
    try {
      const result = await client.post<any>("/users.profile.set", { profile });
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async getProfile(client: SlackClient, user?: string): Promise<ConnectorResult> {
    try {
      const params = user ? { user } : {};
      const result = await client.get<any>("/users.profile.get", params);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async lookupByEmail(client: SlackClient, email: string): Promise<ConnectorResult> {
    try {
      const result = await client.get<any>("/users.lookupByEmail", { email });
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },
};

export default usersActions;
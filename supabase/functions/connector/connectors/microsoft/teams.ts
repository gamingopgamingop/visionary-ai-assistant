import type { ConnectorResult } from "../../../../types.ts";
import { MicrosoftClient } from "../client.ts";

export const teamsActions = {
  async listTeams(client: MicrosoftClient): Promise<ConnectorResult> {
    try {
      const result = await client.get<any>("/me/joinedTeams");
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async getTeam(client: MicrosoftClient, teamId: string): Promise<ConnectorResult> {
    try {
      const team = await client.get<any>(`/teams/${teamId}`);
      return { success: true, data: team };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async listChannels(client: MicrosoftClient, teamId: string): Promise<ConnectorResult> {
    try {
      const result = await client.get<any>(`/teams/${teamId}/channels`);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async getChannel(client: MicrosoftClient, teamId: string, channelId: string): Promise<ConnectorResult> {
    try {
      const channel = await client.get<any>(`/teams/${teamId}/channels/${channelId}`);
      return { success: true, data: channel };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async sendMessage(client: MicrosoftClient, teamId: string, channelId: string, body: {
    body: { content: string; contentType: "text" | "html" };
    attachments?: Array<{ contentType: string; contentUrl: string; name: string }>;
  }): Promise<ConnectorResult> {
    try {
      const message = await client.post<any>(`/teams/${teamId}/channels/${channelId}/messages`, body);
      return { success: true, data: message };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async listMessages(client: MicrosoftClient, teamId: string, channelId: string, params?: {
    $top?: number;
    $filter?: string;
    $orderby?: string;
  }): Promise<ConnectorResult> {
    try {
      const result = await client.get<any>(`/teams/${teamId}/channels/${channelId}/messages`, params);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async replyToMessage(client: MicrosoftClient, teamId: string, channelId: string, messageId: string, body: {
    body: { content: string; contentType: "text" | "html" };
  }): Promise<ConnectorResult> {
    try {
      const reply = await client.post<any>(`/teams/${teamId}/channels/${channelId}/messages/${messageId}/replies`, body);
      return { success: true, data: reply };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async listMembers(client: MicrosoftClient, teamId: string): Promise<ConnectorResult> {
    try {
      const result = await client.get<any>(`/teams/${teamId}/members`);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async addMember(client: MicrosoftClient, teamId: string, userId: string, roles: string[] = ["member"]): Promise<ConnectorResult> {
    try {
      const member = await client.post<any>(`/teams/${teamId}/members`, {
        "@odata.type": "#microsoft.graph.aadUserConversationMember",
        roles,
        "user@odata.bind": `https://graph.microsoft.com/v1.0/users('${userId}')`,
      });
      return { success: true, data: member };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },
};

export default teamsActions;
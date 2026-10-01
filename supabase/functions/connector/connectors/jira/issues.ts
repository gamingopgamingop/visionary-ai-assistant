import type { ConnectorResult } from "../../../../types.ts";
import { JiraClient } from "../client.ts";

export const issuesActions = {
  async search(client: JiraClient, jql: string, params?: {
    startAt?: number;
    maxResults?: number;
    fields?: string;
  }): Promise<ConnectorResult> {
    try {
      const result = await client.get<any>("/search", { jql, ...params });
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async get(client: JiraClient, issueIdOrKey: string, fields?: string): Promise<ConnectorResult> {
    try {
      const issue = await client.get<any>(`/issue/${issueIdOrKey}`, { fields });
      return { success: true, data: issue };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async create(client: JiraClient, fields: Record<string, unknown>): Promise<ConnectorResult> {
    try {
      const issue = await client.post<any>("/issue", { fields });
      return { success: true, data: issue };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async update(client: JiraClient, issueIdOrKey: string, fields: Record<string, unknown>): Promise<ConnectorResult> {
    try {
      const issue = await client.put<any>(`/issue/${issueIdOrKey}`, { fields });
      return { success: true, data: issue };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async delete(client: JiraClient, issueIdOrKey: string): Promise<ConnectorResult> {
    try {
      await client.delete<void>(`/issue/${issueIdOrKey}`);
      return { success: true, data: { deleted: true, issueIdOrKey } };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async transition(client: JiraClient, issueIdOrKey: string, transition: {
    id: string;
    fields?: Record<string, unknown>;
  }): Promise<ConnectorResult> {
    try {
      await client.post<void>(`/issue/${issueIdOrKey}/transitions`, { transition });
      return { success: true, data: { transitioned: true } };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async getTransitions(client: JiraClient, issueIdOrKey: string): Promise<ConnectorResult> {
    try {
      const result = await client.get<any>(`/issue/${issueIdOrKey}/transitions`);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async addComment(client: JiraClient, issueIdOrKey: string, body: string): Promise<ConnectorResult> {
    try {
      const comment = await client.post<any>(`/issue/${issueIdOrKey}/comment`, { body });
      return { success: true, data: comment };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async getComments(client: JiraClient, issueIdOrKey: string): Promise<ConnectorResult> {
    try {
      const result = await client.get<any>(`/issue/${issueIdOrKey}/comment`);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },
};

export default issuesActions;
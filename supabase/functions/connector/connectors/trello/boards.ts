import type { ConnectorResult } from "../../../../types.ts";
import { TrelloClient } from "../client.ts";

export const boardsActions = {
  async list(client: TrelloClient, params?: {
    filter?: "open" | "closed" | "all";
    fields?: string;
  }): Promise<ConnectorResult> {
    try {
      const boards = await client.get<any[]>("/members/me/boards", params);
      return { success: true, data: boards };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async get(client: TrelloClient, id: string, fields?: string): Promise<ConnectorResult> {
    try {
      const board = await client.get<any>(`/boards/${id}`, { fields });
      return { success: true, data: board };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async create(client: TrelloClient, data: {
    name: string;
    desc?: string;
    prefs_permissionLevel?: "private" | "team" | "org" | "public";
    defaultLists?: boolean;
  }): Promise<ConnectorResult> {
    try {
      const board = await client.post<any>("/boards", data);
      return { success: true, data: board };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async update(client: TrelloClient, id: string, data: Record<string, unknown>): Promise<ConnectorResult> {
    try {
      const board = await client.put<any>(`/boards/${id}`, data);
      return { success: true, data: board };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async delete(client: TrelloClient, id: string): Promise<ConnectorResult> {
    try {
      await client.delete<void>(`/boards/${id}`);
      return { success: true, data: { deleted: true, id } };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async getLists(client: TrelloClient, boardId: string, fields?: string): Promise<ConnectorResult> {
    try {
      const lists = await client.get<any[]>(`/boards/${boardId}/lists`, { fields });
      return { success: true, data: lists };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async getCards(client: TrelloClient, boardId: string, params?: {
    filter?: "open" | "closed" | "all";
    fields?: string;
  }): Promise<ConnectorResult> {
    try {
      const cards = await client.get<any[]>(`/boards/${boardId}/cards`, params);
      return { success: true, data: cards };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },
};

export default boardsActions;
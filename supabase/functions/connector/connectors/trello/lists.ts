import type { ConnectorResult } from "../../../../types.ts";
import { TrelloClient } from "../client.ts";

export const listsActions = {
  async list(client: TrelloClient, boardId: string, fields?: string): Promise<ConnectorResult> {
    try {
      const lists = await client.get<any[]>(`/boards/${boardId}/lists`, { fields });
      return { success: true, data: lists };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async get(client: TrelloClient, id: string): Promise<ConnectorResult> {
    try {
      const list = await client.get<any>(`/lists/${id}`);
      return { success: true, data: list };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async create(client: TrelloClient, data: {
    name: string;
    idBoard: string;
    pos?: string;
  }): Promise<ConnectorResult> {
    try {
      const list = await client.post<any>("/lists", data);
      return { success: true, data: list };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async update(client: TrelloClient, id: string, data: Record<string, unknown>): Promise<ConnectorResult> {
    try {
      const list = await client.put<any>(`/lists/${id}`, data);
      return { success: true, data: list };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async archive(client: TrelloClient, id: string): Promise<ConnectorResult> {
    try {
      await client.put<any>(`/lists/${id}`, { closed: true });
      return { success: true, data: { archived: true, id } };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async unarchive(client: TrelloClient, id: string): Promise<ConnectorResult> {
    try {
      await client.put<any>(`/lists/${id}`, { closed: false });
      return { success: true, data: { unarchived: true, id } };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async move(client: TrelloClient, id: string, pos: string): Promise<ConnectorResult> {
    try {
      const list = await client.put<any>(`/lists/${id}`, { pos });
      return { success: true, data: list };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },
};

export default listsActions;
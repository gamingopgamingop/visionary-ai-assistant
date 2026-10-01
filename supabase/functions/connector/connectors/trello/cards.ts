import type { ConnectorResult } from "../../../../types.ts";
import { TrelloClient } from "../client.ts";

export const cardsActions = {
  async list(client: TrelloClient, boardId: string, params?: {
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

  async get(client: TrelloClient, id: string, fields?: string): Promise<ConnectorResult> {
    try {
      const card = await client.get<any>(`/cards/${id}`, { fields });
      return { success: true, data: card };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async create(client: TrelloClient, data: {
    name: string;
    desc?: string;
    idList: string;
    pos?: string;
    due?: string;
    idMembers?: string[];
    idLabels?: string[];
  }): Promise<ConnectorResult> {
    try {
      const card = await client.post<any>("/cards", data);
      return { success: true, data: card };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async update(client: TrelloClient, id: string, data: Record<string, unknown>): Promise<ConnectorResult> {
    try {
      const card = await client.put<any>(`/cards/${id}`, data);
      return { success: true, data: card };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async delete(client: TrelloClient, id: string): Promise<ConnectorResult> {
    try {
      await client.delete<void>(`/cards/${id}`);
      return { success: true, data: { deleted: true, id } };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async move(client: TrelloClient, id: string, data: {
    idList: string;
    pos?: string;
  }): Promise<ConnectorResult> {
    try {
      const card = await client.put<any>(`/cards/${id}`, data);
      return { success: true, data: card };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async addMember(client: TrelloClient, cardId: string, memberId: string): Promise<ConnectorResult> {
    try {
      await client.post<void>(`/cards/${cardId}/idMembers`, { value: memberId });
      return { success: true, data: { added: true, memberId } };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async removeMember(client: TrelloClient, cardId: string, memberId: string): Promise<ConnectorResult> {
    try {
      await client.delete<void>(`/cards/${cardId}/idMembers/${memberId}`);
      return { success: true, data: { removed: true, memberId } };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async addLabel(client: TrelloClient, cardId: string, labelId: string): Promise<ConnectorResult> {
    try {
      await client.post<void>(`/cards/${cardId}/idLabels`, { value: labelId });
      return { success: true, data: { added: true, labelId } };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async removeLabel(client: TrelloClient, cardId: string, labelId: string): Promise<ConnectorResult> {
    try {
      await client.delete<void>(`/cards/${cardId}/idLabels/${labelId}`);
      return { success: true, data: { removed: true, labelId } };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },
};

export default cardsActions;
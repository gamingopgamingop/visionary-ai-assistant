import type { ConnectorResult } from "../../../../types.ts";
import { StripeClient } from "../client.ts";

export const productsActions = {
  async create(client: StripeClient, data: {
    name: string;
    description?: string;
    type?: "good" | "service";
    metadata?: Record<string, string>;
  }): Promise<ConnectorResult> {
    try {
      const product = await client.post<any>("/products", data);
      return { success: true, data: product };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async get(client: StripeClient, productId: string): Promise<ConnectorResult> {
    try {
      const product = await client.get<any>(`/products/${productId}`);
      return { success: true, data: product };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async update(client: StripeClient, productId: string, data: {
    name?: string;
    description?: string;
    metadata?: Record<string, string>;
  }): Promise<ConnectorResult> {
    try {
      const product = await client.post<any>(`/products/${productId}`, data);
      return { success: true, data: product };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async list(client: StripeClient, params?: {
    limit?: number;
    starting_after?: string;
    active?: boolean;
  }): Promise<ConnectorResult> {
    try {
      const result = await client.get<any>("/products", params);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async delete(client: StripeClient, productId: string): Promise<ConnectorResult> {
    try {
      await client.delete<void>(`/products/${productId}`);
      return { success: true, data: { deleted: true, productId } };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },
};

export default productsActions;
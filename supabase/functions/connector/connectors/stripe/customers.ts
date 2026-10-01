import type { ConnectorResult } from "../../../../types.ts";
import { StripeClient } from "../client.ts";

export const customersActions = {
  async create(client: StripeClient, data: {
    email?: string;
    name?: string;
    description?: string;
    metadata?: Record<string, string>;
  }): Promise<ConnectorResult> {
    try {
      const customer = await client.post<any>("/customers", data);
      return { success: true, data: customer };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async get(client: StripeClient, customerId: string): Promise<ConnectorResult> {
    try {
      const customer = await client.get<any>(`/customers/${customerId}`);
      return { success: true, data: customer };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async update(client: StripeClient, customerId: string, data: {
    email?: string;
    name?: string;
    description?: string;
    metadata?: Record<string, string>;
  }): Promise<ConnectorResult> {
    try {
      const customer = await client.post<any>(`/customers/${customerId}`, data);
      return { success: true, data: customer };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async list(client: StripeClient, params?: {
    limit?: number;
    starting_after?: string;
    ending_before?: string;
  }): Promise<ConnectorResult> {
    try {
      const result = await client.get<any>("/customers", params);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async delete(client: StripeClient, customerId: string): Promise<ConnectorResult> {
    try {
      await client.delete<void>(`/customers/${customerId}`);
      return { success: true, data: { deleted: true, customerId } };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },
};

export default customersActions;
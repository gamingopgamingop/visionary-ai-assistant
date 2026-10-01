import type { ConnectorResult } from "../../../../types.ts";
import { StripeClient } from "../client.ts";

export const subscriptionsActions = {
  async create(client: StripeClient, data: {
    customer: string;
    items: Array<{ price: string; quantity?: number }>;
    payment_behavior?: string;
    payment_settings?: { save_default_payment_method?: string };
    expand?: string[];
  }): Promise<ConnectorResult> {
    try {
      const subscription = await client.post<any>("/subscriptions", data);
      return { success: true, data: subscription };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async get(client: StripeClient, subscriptionId: string): Promise<ConnectorResult> {
    try {
      const subscription = await client.get<any>(`/subscriptions/${subscriptionId}`);
      return { success: true, data: subscription };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async update(client: StripeClient, subscriptionId: string, data: {
    items?: Array<{ id: string; price?: string; quantity?: number }>;
    cancel_at_period_end?: boolean;
    proration_behavior?: string;
  }): Promise<ConnectorResult> {
    try {
      const subscription = await client.post<any>(`/subscriptions/${subscriptionId}`, data);
      return { success: true, data: subscription };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async list(client: StripeClient, params?: {
    customer?: string;
    status?: string;
    limit?: number;
  }): Promise<ConnectorResult> {
    try {
      const result = await client.get<any>("/subscriptions", params);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async cancel(client: StripeClient, subscriptionId: string): Promise<ConnectorResult> {
    try {
      await client.delete<void>(`/subscriptions/${subscriptionId}`);
      return { success: true, data: { cancelled: true, subscriptionId } };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },
};

export default subscriptionsActions;
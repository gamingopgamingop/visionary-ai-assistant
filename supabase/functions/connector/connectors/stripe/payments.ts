import type { ConnectorResult } from "../../../../types.ts";
import { StripeClient } from "../client.ts";

export const paymentsActions = {
  async createPaymentIntent(client: StripeClient, data: {
    amount: number;
    currency: string;
    customer?: string;
    payment_method_types?: string[];
    metadata?: Record<string, string>;
  }): Promise<ConnectorResult> {
    try {
      const intent = await client.post<any>("/payment_intents", data);
      return { success: true, data: intent };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async getPaymentIntent(client: StripeClient, paymentIntentId: string): Promise<ConnectorResult> {
    try {
      const intent = await client.get<any>(`/payment_intents/${paymentIntentId}`);
      return { success: true, data: intent };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async confirmPaymentIntent(client: StripeClient, paymentIntentId: string, data?: {
    payment_method?: string;
    return_url?: string;
  }): Promise<ConnectorResult> {
    try {
      const intent = await client.post<any>(`/payment_intents/${paymentIntentId}/confirm`, data);
      return { success: true, data: intent };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async listPaymentIntents(client: StripeClient, params?: {
    customer?: string;
    limit?: number;
  }): Promise<ConnectorResult> {
    try {
      const result = await client.get<any>("/payment_intents", params);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async createSetupIntent(client: StripeClient, data: {
    customer?: string;
    payment_method_types?: string[];
    metadata?: Record<string, string>;
  }): Promise<ConnectorResult> {
    try {
      const intent = await client.post<any>("/setup_intents", data);
      return { success: true, data: intent };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },
};

export default paymentsActions;
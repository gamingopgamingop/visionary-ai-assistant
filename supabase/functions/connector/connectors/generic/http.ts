import type { ConnectorResult } from "../../../../types.ts";
import { GenericClient } from "../client.ts";

export const httpActions = {
  async request(client: GenericClient, data: {
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    url: string;
    headers?: Record<string, string>;
    body?: unknown;
    params?: Record<string, unknown>;
  }): Promise<ConnectorResult> {
    try {
      const { method, url, headers, body, params } = data;
      let result: any;
      
      switch (method) {
        case "GET":
          result = await client.get<any>(url, params, headers);
          break;
        case "POST":
          result = await client.post<any>(url, body, params, headers);
          break;
        case "PUT":
          result = await client.put<any>(url, body, params, headers);
          break;
        case "PATCH":
          result = await client.patch<any>(url, body, params, headers);
          break;
        case "DELETE":
          result = await client.delete<any>(url, params, headers);
          break;
      }
      
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async get(client: GenericClient, url: string, params?: Record<string, unknown>, headers?: Record<string, string>): Promise<ConnectorResult> {
    try {
      const result = await client.get<any>(url, params, headers);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async post(client: GenericClient, url: string, body?: unknown, params?: Record<string, unknown>, headers?: Record<string, string>): Promise<ConnectorResult> {
    try {
      const result = await client.post<any>(url, body, params, headers);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },
};

export default httpActions;
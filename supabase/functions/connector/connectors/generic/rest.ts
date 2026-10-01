import type { ConnectorResult } from "../../../../types.ts";
import { GenericClient } from "../client.ts";

export const restActions = {
  async request(client: GenericClient, data: {
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    path: string;
    baseUrl: string;
    headers?: Record<string, string>;
    body?: unknown;
    query?: Record<string, unknown>;
  }): Promise<ConnectorResult> {
    try {
      const { method, path, baseUrl, headers, body, query } = data;
      const url = new URL(path, baseUrl).toString();
      let result: any;
      
      switch (method) {
        case "GET":
          result = await client.get<any>(url, query, headers);
          break;
        case "POST":
          result = await client.post<any>(url, body, query, headers);
          break;
        case "PUT":
          result = await client.put<any>(url, body, query, headers);
          break;
        case "PATCH":
          result = await client.patch<any>(url, body, query, headers);
          break;
        case "DELETE":
          result = await client.delete<any>(url, query, headers);
          break;
      }
      
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async get(client: GenericClient, baseUrl: string, path: string, query?: Record<string, unknown>, headers?: Record<string, string>): Promise<ConnectorResult> {
    try {
      const result = await client.get<any>(new URL(path, baseUrl).toString(), query, headers);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async post(client: GenericClient, baseUrl: string, path: string, body?: unknown, query?: Record<string, unknown>, headers?: Record<string, string>): Promise<ConnectorResult> {
    try {
      const result = await client.post<any>(new URL(path, baseUrl).toString(), body, query, headers);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },
};

export default restActions;
import type { ConnectorResult } from "../../../../types.ts";
import { SupabaseClient } from "../client.ts";

export const databaseActions = {
  async select(client: SupabaseClient, table: string, params?: {
    select?: string;
    filter?: string;
    order?: string;
    limit?: number;
    offset?: number;
  }): Promise<ConnectorResult> {
    try {
      const queryParams: Record<string, string> = {};
      if (params?.select) queryParams.select = params.select;
      if (params?.filter) queryParams[params.filter] = "";
      if (params?.order) queryParams.order = params.order;
      if (params?.limit) queryParams.limit = String(params.limit);
      if (params?.offset) queryParams.offset = String(params.offset);

      const data = await client.get<any[]>(`/rest/v1/${table}`, queryParams);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async insert(client: SupabaseClient, table: string, data: unknown | unknown[], returning: string = "minimal"): Promise<ConnectorResult> {
    try {
      const result = await client.post<any>(`/rest/v1/${table}`, data, { Prefer: `return=${returning}` });
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async update(client: SupabaseClient, table: string, data: Record<string, unknown>, filter: string): Promise<ConnectorResult> {
    try {
      const result = await client.patch<any>(`/rest/v1/${table}?${filter}`, data);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async delete(client: SupabaseClient, table: string, filter: string): Promise<ConnectorResult> {
    try {
      await client.delete<void>(`/rest/v1/${table}?${filter}`);
      return { success: true, data: { deleted: true } };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async rpc(client: SupabaseClient, functionName: string, params: Record<string, unknown>): Promise<ConnectorResult> {
    try {
      const result = await client.post<any>(`/rest/v1/rpc/${functionName}`, params);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },
};

export default databaseActions;
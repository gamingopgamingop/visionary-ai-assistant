import type { ConnectorResult } from "../../../../types.ts";
import { SupabaseClient } from "../client.ts";

export const functionsActions = {
  async invoke(client: SupabaseClient, functionName: string, body?: Record<string, unknown>): Promise<ConnectorResult> {
    try {
      const result = await client.post<any>(`/functions/v1/${functionName}`, body);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async invokeAsync(client: SupabaseClient, functionName: string, body?: Record<string, unknown>): Promise<ConnectorResult> {
    try {
      // For async invocation, we can use the invoke method but with a different header
      const result = await client.post<any>(`/functions/v1/${functionName}`, body, {
        "X-Invoke-Async": "true",
      });
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },
};

export default functionsActions;
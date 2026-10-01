import type { ConnectorResult } from "../../../../types.ts";
import { GenericClient } from "../client.ts";

export const graphqlActions = {
  async request(client: GenericClient, data: {
    query: string;
    variables?: Record<string, unknown>;
    headers?: Record<string, string>;
  }): Promise<ConnectorResult> {
    try {
      const { query, variables, headers } = data;
      const result = await client.post<any>("", { query, variables }, {}, headers);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async query(client: GenericClient, query: string, variables?: Record<string, unknown>, headers?: Record<string, string>): Promise<ConnectorResult> {
    return this.request(client, { query, variables, headers });
  },

  async mutation(client: GenericClient, query: string, variables?: Record<string, unknown>, headers?: Record<string, string>): Promise<ConnectorResult> {
    return this.request(client, { query, variables, headers });
  },
};

export default graphqlActions;
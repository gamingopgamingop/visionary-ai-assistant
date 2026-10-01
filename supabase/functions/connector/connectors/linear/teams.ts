import type { ConnectorResult } from "../../../../types.ts";
import { LinearClient } from "../client.ts";

export const teamsActions = {
  async list(client: LinearClient): Promise<ConnectorResult> {
    try {
      const query = `
        query GetTeams {
          teams {
            nodes {
              id
              name
              key
              description
              private
              createdAt
              updatedAt
            }
          }
        }
      `;
      const result = await client.executeQuery<{ teams: { nodes: any[] } }>(query);
      return { success: true, data: result.teams };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async get(client: LinearClient, id: string): Promise<ConnectorResult> {
    try {
      const query = `
        query GetTeam($id: String!) {
          team(id: $id) {
            id
            name
            key
            description
            private
            members { nodes { id name email } }
            projects { nodes { id name } }
            issues { nodes { id identifier title } }
            createdAt
            updatedAt
          }
        }
      `;
      const result = await client.executeQuery<{ team: any }>(query, { id });
      return { success: true, data: result.team };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },
};

export default teamsActions;
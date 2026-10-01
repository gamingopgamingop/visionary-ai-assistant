import type { ConnectorResult } from "../../../../types.ts";
import { LinearClient } from "../client.ts";

export const projectsActions = {
  async list(client: LinearClient): Promise<ConnectorResult> {
    try {
      const query = `
        query GetProjects {
          projects {
            nodes {
              id
              name
              description
              state
              progress
              startDate
              targetDate
              team { id name }
              lead { id name }
              createdAt
              updatedAt
            }
          }
        }
      `;
      const result = await client.executeQuery<{ projects: { nodes: any[] } }>(query);
      return { success: true, data: result.projects };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async get(client: LinearClient, id: string): Promise<ConnectorResult> {
    try {
      const query = `
        query GetProject($id: String!) {
          project(id: $id) {
            id
            name
            description
            state
            progress
            startDate
            targetDate
            team { id name }
            lead { id name }
            members { nodes { id name } }
            issues { nodes { id identifier title } }
            createdAt
            updatedAt
          }
        }
      `;
      const result = await client.executeQuery<{ project: any }>(query, { id });
      return { success: true, data: result.project };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },
};

export default projectsActions;
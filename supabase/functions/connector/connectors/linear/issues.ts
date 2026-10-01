import type { ConnectorResult } from "../../../../types.ts";
import { LinearClient } from "../client.ts";

export const issuesActions = {
  async list(client: LinearClient, params?: {
    filter?: Record<string, unknown>;
    first?: number;
    after?: string;
    orderBy?: string;
  }): Promise<ConnectorResult> {
    try {
      const query = `
        query GetIssues($filter: IssueFilter, $first: Int, $after: String, $orderBy: IssueOrder) {
          issues(filter: $filter, first: $first, after: $after, orderBy: $orderBy) {
            nodes {
              id
              identifier
              title
              description
              state
              priority
              assignee { id name email }
              project { id name }
              team { id name }
              createdAt
              updatedAt
            }
            pageInfo { hasNextPage endCursor }
          }
        }
      `;
      const result = await client.executeQuery<{ issues: { nodes: any[]; pageInfo: any } }>(query, params);
      return { success: true, data: result.issues };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async get(client: LinearClient, id: string): Promise<ConnectorResult> {
    try {
      const query = `
        query GetIssue($id: String!) {
          issue(id: $id) {
            id
            identifier
            title
            description
            state
            priority
            assignee { id name email }
            project { id name }
            team { id name }
            createdAt
            updatedAt
            labels { nodes { id name color } }
            comments { nodes { id body createdAt user { id name } } }
          }
        }
      `;
      const result = await client.executeQuery<{ issue: any }>(query, { id });
      return { success: true, data: result.issue };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async create(client: LinearClient, input: {
    teamId: string;
    title: string;
    description?: string;
    projectId?: string;
    assigneeId?: string;
    priority?: number;
    labelIds?: string[];
  }): Promise<ConnectorResult> {
    try {
      const query = `
        mutation CreateIssue($input: IssueCreateInput!) {
          issueCreate(input: $input) {
            success
            issue { id identifier title }
          }
        }
      `;
      const result = await client.executeQuery<{ issueCreate: { success: boolean; issue: any } }>(query, { input });
      return { success: true, data: result.issueCreate };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async update(client: LinearClient, id: string, input: Record<string, unknown>): Promise<ConnectorResult> {
    try {
      const query = `
        mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) {
          issueUpdate(id: $id, input: $input) {
            success
            issue { id identifier title }
          }
        }
      `;
      const result = await client.executeQuery<{ issueUpdate: { success: boolean; issue: any } }>(query, { id, input });
      return { success: true, data: result.issueUpdate };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },
};

export default issuesActions;
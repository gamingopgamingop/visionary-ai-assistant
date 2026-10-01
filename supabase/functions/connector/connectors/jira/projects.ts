import type { ConnectorResult } from "../../../../types.ts";
import { JiraClient } from "../client.ts";

export const projectsActions = {
  async list(client: JiraClient): Promise<ConnectorResult> {
    try {
      const projects = await client.get<any[]>("/project");
      return { success: true, data: projects };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async get(client: JiraClient, projectIdOrKey: string): Promise<ConnectorResult> {
    try {
      const project = await client.get<any>(`/project/${projectIdOrKey}`);
      return { success: true, data: project };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async getComponents(client: JiraClient, projectIdOrKey: string): Promise<ConnectorResult> {
    try {
      const components = await client.get<any[]>(`/project/${projectIdOrKey}/components`);
      return { success: true, data: components };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async getVersions(client: JiraClient, projectIdOrKey: string): Promise<ConnectorResult> {
    try {
      const versions = await client.get<any[]>(`/project/${projectIdOrKey}/versions`);
      return { success: true, data: versions };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async getRoles(client: JiraClient, projectIdOrKey: string): Promise<ConnectorResult> {
    try {
      const roles = await client.get<any>(`/project/${projectIdOrKey}/role`);
      return { success: true, data: roles };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },
};

export default projectsActions;
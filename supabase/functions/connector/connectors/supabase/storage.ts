import type { ConnectorResult } from "../../../../types.ts";
import { SupabaseClient } from "../client.ts";

export const storageActions = {
  async list(client: SupabaseClient, bucket: string, params?: {
    prefix?: string;
    limit?: number;
    offset?: number;
  }): Promise<ConnectorResult> {
    try {
      const data = await client.get<any[]>(`/storage/v1/object/list/${bucket}`, params);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async upload(client: SupabaseClient, bucket: string, path: string, file: Blob, contentType?: string): Promise<ConnectorResult> {
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await fetch(`${client["baseUrl"]}/storage/v1/object/${bucket}/${path}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${client["apiKey"]}`,
          apikey: client["apiKey"],
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async download(client: SupabaseClient, bucket: string, path: string): Promise<ConnectorResult> {
    try {
      const response = await fetch(`${client["baseUrl"]}/storage/v1/object/${bucket}/${path}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${client["apiKey"]}`,
          apikey: client["apiKey"],
        },
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }

      const blob = await response.blob();
      return { success: true, data: blob };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async delete(client: SupabaseClient, bucket: string, path: string): Promise<ConnectorResult> {
    try {
      await client.delete<void>(`/storage/v1/object/${bucket}/${path}`);
      return { success: true, data: { deleted: true } };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async createBucket(client: SupabaseClient, bucket: string, options?: { public?: boolean }): Promise<ConnectorResult> {
    try {
      const result = await client.post<any>("/storage/v1/bucket", { name: bucket, public: options?.public });
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },

  async listBuckets(client: SupabaseClient): Promise<ConnectorResult> {
    try {
      const result = await client.get<any[]>("/storage/v1/bucket");
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error as any };
    }
  },
};

export default storageActions;
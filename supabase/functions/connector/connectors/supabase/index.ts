import type { ConnectorConfig, AuthConfig, RateLimitConfig, PermissionConfig } from "../../types.ts";

export const supabaseConfig: ConnectorConfig = {
  type: "supabase",
  name: "supabase",
  displayName: "Supabase",
  description: "Connect to Supabase to manage database, storage, and functions",
  version: "1.0.0",
  auth: {
    type: "api_key",
    apiKey: {
      headerName: "Authorization",
      prefix: "Bearer",
    },
  } as AuthConfig,
  baseUrl: "{projectRef}.supabase.co",
  endpoints: {
    // Database
    select: {
      method: "POST",
      path: "/rest/v1/{table}",
      description: "Select rows",
      authRequired: true,
      requestBody: {
        contentType: "application/json",
        required: false,
      },
    },
    insert: {
      method: "POST",
      path: "/rest/v1/{table}",
      description: "Insert rows",
      authRequired: true,
      requestBody: {
        contentType: "application/json",
        required: true,
      },
    },
    update: {
      method: "PATCH",
      path: "/rest/v1/{table}",
      description: "Update rows",
      authRequired: true,
      requestBody: {
        contentType: "application/json",
        required: true,
      },
    },
    delete: {
      method: "DELETE",
      path: "/rest/v1/{table}",
      description: "Delete rows",
      authRequired: true,
    },
    // RPC
    rpc: {
      method: "POST",
      path: "/rest/v1/rpc/{function}",
      description: "Call RPC function",
      authRequired: true,
      requestBody: {
        contentType: "application/json",
        required: true,
      },
    },
    // Storage
    storageList: {
      method: "GET",
      path: "/storage/v1/object/list/{bucket}",
      description: "List storage objects",
      authRequired: true,
      parameters: [
        { name: "bucket", in: "path", required: true, type: "string" },
        { name: "prefix", in: "query", required: false, type: "string" },
        { name: "limit", in: "query", required: false, type: "number" },
        { name: "offset", in: "query", required: false, type: "number" },
      ],
    },
    storageUpload: {
      method: "POST",
      path: "/storage/v1/object/{bucket}/{path}",
      description: "Upload storage object",
      authRequired: true,
      parameters: [
        { name: "bucket", in: "path", required: true, type: "string" },
        { name: "path", in: "path", required: true, type: "string" },
      ],
      requestBody: {
        contentType: "multipart/form-data",
        required: true,
      },
    },
    storageDownload: {
      method: "GET",
      path: "/storage/v1/object/{bucket}/{path}",
      description: "Download storage object",
      authRequired: true,
      parameters: [
        { name: "bucket", in: "path", required: true, type: "string" },
        { name: "path", in: "path", required: true, type: "string" },
      ],
    },
    storageDelete: {
      method: "DELETE",
      path: "/storage/v1/object/{bucket}/{path}",
      description: "Delete storage object",
      authRequired: true,
      parameters: [
        { name: "bucket", in: "path", required: true, type: "string" },
        { name: "path", in: "path", required: true, type: "string" },
      ],
    },
    // Functions
    functionsInvoke: {
      method: "POST",
      path: "/functions/v1/{function}",
      description: "Invoke Edge Function",
      authRequired: true,
      parameters: [
        { name: "function", in: "path", required: true, type: "string" },
      ],
      requestBody: {
        contentType: "application/json",
        required: false,
      },
    },
  },
  rateLimits: {
    requests: 1000,
    windowMs: 60000,
  } as RateLimitConfig,
  permissions: {
    scopes: [],
    requiredPermissions: [],
    optionalPermissions: [],
  } as PermissionConfig,
  webhooks: {
    events: [
      "INSERT",
      "UPDATE",
      "DELETE",
    ],
    secretHeader: "X-Supabase-Signature",
  },
  metadata: {
    categories: ["database", "storage", "functions", "backend"],
    tags: ["supabase", "postgres", "storage", "edge-functions", "realtime"],
  },
};

export default supabaseConfig;
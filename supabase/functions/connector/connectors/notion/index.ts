import type { ConnectorConfig, AuthConfig, RateLimitConfig, PermissionConfig } from "../../types.ts";

export const notionConfig: ConnectorConfig = {
  type: "notion",
  name: "notion",
  displayName: "Notion",
  description: "Connect to Notion to manage pages, databases, and search",
  version: "1.0.0",
  auth: {
    type: "oauth2",
    oauth2: {
      authorizationUrl: "https://api.notion.com/v1/oauth/authorize",
      tokenUrl: "https://api.notion.com/v1/oauth/token",
      clientId: Deno.env.get("NOTION_CLIENT_ID") || "",
      clientSecret: Deno.env.get("NOTION_CLIENT_SECRET") || "",
      scopes: [],
      redirectUri: Deno.env.get("NOTION_REDIRECT_URI") || "",
      pkce: false,
    },
  } as AuthConfig,
  baseUrl: "https://api.notion.com/v1",
  endpoints: {
    getUser: {
      method: "GET",
      path: "/users/me",
      description: "Get current user",
      authRequired: true,
    },
    // Pages
    getPage: {
      method: "GET",
      path: "/pages/{page_id}",
      description: "Get a page",
      authRequired: true,
      parameters: [
        { name: "page_id", in: "path", required: true, type: "string" },
      ],
    },
    createPage: {
      method: "POST",
      path: "/pages",
      description: "Create a page",
      authRequired: true,
      requestBody: {
        contentType: "application/json",
        required: true,
        schema: {
          type: "object",
          properties: {
            parent: { type: "object" },
            properties: { type: "object" },
            children: { type: "array" },
            icon: { type: "object" },
            cover: { type: "object" },
          },
          required: ["parent", "properties"],
        },
      },
    },
    updatePage: {
      method: "PATCH",
      path: "/pages/{page_id}",
      description: "Update a page",
      authRequired: true,
      parameters: [
        { name: "page_id", in: "path", required: true, type: "string" },
      ],
      requestBody: {
        contentType: "application/json",
        required: true,
      },
    },
    getPageChildren: {
      method: "GET",
      path: "/blocks/{block_id}/children",
      description: "Get block children",
      authRequired: true,
      parameters: [
        { name: "block_id", in: "path", required: true, type: "string" },
        { name: "start_cursor", in: "query", required: false, type: "string" },
        { name: "page_size", in: "query", required: false, type: "number" },
      ],
    },
    appendBlockChildren: {
      method: "PATCH",
      path: "/blocks/{block_id}/children",
      description: "Append block children",
      authRequired: true,
      parameters: [
        { name: "block_id", in: "path", required: true, type: "string" },
      ],
      requestBody: {
        contentType: "application/json",
        required: true,
      },
    },
    // Databases
    getDatabase: {
      method: "GET",
      path: "/databases/{database_id}",
      description: "Get a database",
      authRequired: true,
      parameters: [
        { name: "database_id", in: "path", required: true, type: "string" },
      ],
    },
    queryDatabase: {
      method: "POST",
      path: "/databases/{database_id}/query",
      description: "Query a database",
      authRequired: true,
      parameters: [
        { name: "database_id", in: "path", required: true, type: "string" },
      ],
      requestBody: {
        contentType: "application/json",
        required: true,
        schema: {
          type: "object",
          properties: {
            filter: { type: "object" },
            sorts: { type: "array" },
            start_cursor: { type: "string" },
            page_size: { type: "number" },
          },
        },
      },
    },
    createDatabase: {
      method: "POST",
      path: "/databases",
      description: "Create a database",
      authRequired: true,
      requestBody: {
        contentType: "application/json",
        required: true,
        schema: {
          type: "object",
          properties: {
            parent: { type: "object" },
            title: { type: "array" },
            properties: { type: "object" },
          },
          required: ["parent", "title", "properties"],
        },
      },
    },
    updateDatabase: {
      method: "PATCH",
      path: "/databases/{database_id}",
      description: "Update a database",
      authRequired: true,
      parameters: [
        { name: "database_id", in: "path", required: true, type: "string" },
      ],
      requestBody: {
        contentType: "application/json",
        required: true,
      },
    },
    // Search
    search: {
      method: "POST",
      path: "/search",
      description: "Search pages and databases",
      authRequired: true,
      requestBody: {
        contentType: "application/json",
        required: true,
        schema: {
          type: "object",
          properties: {
            query: { type: "string" },
            filter: { type: "object" },
            sort: { type: "object" },
            start_cursor: { type: "string" },
            page_size: { type: "number" },
          },
        },
      },
    },
    // Users
    listUsers: {
      method: "GET",
      path: "/users",
      description: "List users",
      authRequired: true,
      parameters: [
        { name: "start_cursor", in: "query", required: false, type: "string" },
        { name: "page_size", in: "query", required: false, type: "number" },
      ],
    },
    getUser: {
      method: "GET",
      path: "/users/{user_id}",
      description: "Get a user",
      authRequired: true,
      parameters: [
        { name: "user_id", in: "path", required: true, type: "string" },
      ],
    },
  },
  rateLimits: {
    requests: 3,
    windowMs: 1000,
  } as RateLimitConfig,
  permissions: {
    scopes: [],
    requiredPermissions: [],
    optionalPermissions: [],
  } as PermissionConfig,
  webhooks: {
    events: [],
    secretHeader: "",
  },
  metadata: {
    categories: ["productivity", "documentation"],
    tags: ["notion", "pages", "databases", "notes", "wiki"],
  },
};

export default notionConfig;
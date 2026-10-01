import type { ConnectorConfig, AuthConfig, RateLimitConfig, PermissionConfig } from "../../types.ts";

export const genericConfig: ConnectorConfig = {
  type: "generic",
  name: "generic",
  displayName: "Generic HTTP/REST/GraphQL",
  description: "Generic connector for custom HTTP, REST, and GraphQL APIs",
  version: "1.0.0",
  auth: {
    type: "none",
  } as AuthConfig,
  baseUrl: "",
  endpoints: {
    httpRequest: {
      method: "POST",
      path: "/http",
      description: "Make HTTP request",
      authRequired: false,
      requestBody: {
        contentType: "application/json",
        required: true,
        schema: {
          type: "object",
          properties: {
            method: { type: "string", enum: ["GET", "POST", "PUT", "PATCH", "DELETE"] },
            url: { type: "string" },
            headers: { type: "object" },
            body: { type: "object" },
            params: { type: "object" },
          },
          required: ["method", "url"],
        },
      },
    },
    restRequest: {
      method: "POST",
      path: "/rest",
      description: "Make REST request",
      authRequired: false,
      requestBody: {
        contentType: "application/json",
        required: true,
        schema: {
          type: "object",
          properties: {
            method: { type: "string", enum: ["GET", "POST", "PUT", "PATCH", "DELETE"] },
            path: { type: "string" },
            baseUrl: { type: "string" },
            headers: { type: "object" },
            body: { type: "object" },
            query: { type: "object" },
          },
          required: ["method", "path", "baseUrl"],
        },
      },
    },
    graphqlRequest: {
      method: "POST",
      path: "/graphql",
      description: "Make GraphQL request",
      authRequired: false,
      requestBody: {
        contentType: "application/json",
        required: true,
        schema: {
          type: "object",
          properties: {
            query: { type: "string" },
            variables: { type: "object" },
            headers: { type: "object" },
          },
          required: ["query"],
        },
      },
    },
  },
  rateLimits: {
    requests: 100,
    windowMs: 60000,
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
    categories: ["integration", "api"],
    tags: ["generic", "http", "rest", "graphql", "custom"],
  },
};

export default genericConfig;
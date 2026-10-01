import type { ConnectorConfig, AuthConfig, RateLimitConfig, PermissionConfig } from "../../types.ts";

export const linearConfig: ConnectorConfig = {
  type: "linear",
  name: "linear",
  displayName: "Linear",
  description: "Connect to Linear to manage issues, projects, and teams",
  version: "1.0.0",
  auth: {
    type: "api_key",
    apiKey: {
      headerName: "Authorization",
      prefix: "Bearer",
    },
  } as AuthConfig,
  baseUrl: "https://api.linear.app/graphql",
  endpoints: {
    getViewer: {
      method: "POST",
      path: "",
      description: "Get current user",
      authRequired: true,
      requestBody: {
        contentType: "application/json",
        required: true,
        schema: {
          type: "object",
          properties: {
            query: { type: "string" },
          },
          required: ["query"],
        },
      },
    },
    // Issues
    getIssues: {
      method: "POST",
      path: "",
      description: "Get issues",
      authRequired: true,
      requestBody: {
        contentType: "application/json",
        required: true,
        schema: {
          type: "object",
          properties: {
            query: { type: "string" },
            variables: { type: "object" },
          },
          required: ["query"],
        },
      },
    },
    getIssue: {
      method: "POST",
      path: "",
      description: "Get an issue",
      authRequired: true,
      requestBody: {
        contentType: "application/json",
        required: true,
        schema: {
          type: "object",
          properties: {
            query: { type: "string" },
            variables: { type: "object" },
          },
          required: ["query"],
        },
      },
    },
    createIssue: {
      method: "POST",
      path: "",
      description: "Create an issue",
      authRequired: true,
      requestBody: {
        contentType: "application/json",
        required: true,
        schema: {
          type: "object",
          properties: {
            query: { type: "string" },
            variables: { type: "object" },
          },
          required: ["query"],
        },
      },
    },
    updateIssue: {
      method: "POST",
      path: "",
      description: "Update an issue",
      authRequired: true,
      requestBody: {
        contentType: "application/json",
        required: true,
        schema: {
          type: "object",
          properties: {
            query: { type: "string" },
            variables: { type: "object" },
          },
          required: ["query"],
        },
      },
    },
    // Projects
    getProjects: {
      method: "POST",
      path: "",
      description: "Get projects",
      authRequired: true,
      requestBody: {
        contentType: "application/json",
        required: true,
        schema: {
          type: "object",
          properties: {
            query: { type: "string" },
          },
          required: ["query"],
        },
      },
    },
    getProject: {
      method: "POST",
      path: "",
      description: "Get a project",
      authRequired: true,
      requestBody: {
        contentType: "application/json",
        required: true,
        schema: {
          type: "object",
          properties: {
            query: { type: "string" },
            variables: { type: "object" },
          },
          required: ["query"],
        },
      },
    },
    // Teams
    getTeams: {
      method: "POST",
      path: "",
      description: "Get teams",
      authRequired: true,
      requestBody: {
        contentType: "application/json",
        required: true,
        schema: {
          type: "object",
          properties: {
            query: { type: "string" },
          },
          required: ["query"],
        },
      },
    },
    getTeam: {
      method: "POST",
      path: "",
      description: "Get a team",
      authRequired: true,
      requestBody: {
        contentType: "application/json",
        required: true,
        schema: {
          type: "object",
          properties: {
            query: { type: "string" },
            variables: { type: "object" },
          },
          required: ["query"],
        },
      },
    },
  },
  rateLimits: {
    requests: 500,
    windowMs: 60000,
  } as RateLimitConfig,
  permissions: {
    scopes: [],
    requiredPermissions: [],
    optionalPermissions: [],
  } as PermissionConfig,
  webhooks: {
    events: [
      "IssueCreated",
      "IssueUpdated",
      "IssueRemoved",
      "ProjectCreated",
      "ProjectUpdated",
    ],
    secretHeader: "Linear-Signature",
  },
  metadata: {
    categories: ["project-management", "issue-tracking"],
    tags: ["linear", "issues", "projects", "teams", "graphql"],
  },
};

export default linearConfig;
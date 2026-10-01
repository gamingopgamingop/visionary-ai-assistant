import type { ConnectorConfig, AuthConfig, RateLimitConfig, PermissionConfig } from "../../types.ts";

export const jiraConfig: ConnectorConfig = {
  type: "jira",
  name: "jira",
  displayName: "Jira",
  description: "Connect to Jira to manage issues, projects, and users",
  version: "1.0.0",
  auth: {
    type: "basic",
    basic: {
      username: Deno.env.get("JIRA_EMAIL") || "",
      password: Deno.env.get("JIRA_API_TOKEN") || "",
    },
  } as AuthConfig,
  baseUrl: "https://{domain}.atlassian.net/rest/api/3",
  endpoints: {
    getMyself: {
      method: "GET",
      path: "/myself",
      description: "Get current user",
      authRequired: true,
    },
    // Issues
    searchIssues: {
      method: "GET",
      path: "/search",
      description: "Search issues",
      authRequired: true,
      parameters: [
        { name: "jql", in: "query", required: true, type: "string" },
        { name: "startAt", in: "query", required: false, type: "number" },
        { name: "maxResults", in: "query", required: false, type: "number" },
        { name: "fields", in: "query", required: false, type: "string" },
      ],
    },
    getIssue: {
      method: "GET",
      path: "/issue/{issueIdOrKey}",
      description: "Get an issue",
      authRequired: true,
      parameters: [
        { name: "issueIdOrKey", in: "path", required: true, type: "string" },
        { name: "fields", in: "query", required: false, type: "string" },
      ],
    },
    createIssue: {
      method: "POST",
      path: "/issue",
      description: "Create an issue",
      authRequired: true,
      requestBody: {
        contentType: "application/json",
        required: true,
        schema: {
          type: "object",
          properties: {
            fields: { type: "object" },
          },
          required: ["fields"],
        },
      },
    },
    updateIssue: {
      method: "PUT",
      path: "/issue/{issueIdOrKey}",
      description: "Update an issue",
      authRequired: true,
      parameters: [
        { name: "issueIdOrKey", in: "path", required: true, type: "string" },
      ],
      requestBody: {
        contentType: "application/json",
        required: true,
      },
    },
    deleteIssue: {
      method: "DELETE",
      path: "/issue/{issueIdOrKey}",
      description: "Delete an issue",
      authRequired: true,
      parameters: [
        { name: "issueIdOrKey", in: "path", required: true, type: "string" },
      ],
    },
    transitionIssue: {
      method: "POST",
      path: "/issue/{issueIdOrKey}/transitions",
      description: "Transition an issue",
      authRequired: true,
      parameters: [
        { name: "issueIdOrKey", in: "path", required: true, type: "string" },
      ],
      requestBody: {
        contentType: "application/json",
        required: true,
      },
    },
    // Projects
    getProjects: {
      method: "GET",
      path: "/project",
      description: "Get all projects",
      authRequired: true,
    },
    getProject: {
      method: "GET",
      path: "/project/{projectIdOrKey}",
      description: "Get a project",
      authRequired: true,
      parameters: [
        { name: "projectIdOrKey", in: "path", required: true, type: "string" },
      ],
    },
    // Users
    getUser: {
      method: "GET",
      path: "/user",
      description: "Get user",
      authRequired: true,
      parameters: [
        { name: "accountId", in: "query", required: true, type: "string" },
      ],
    },
    searchUsers: {
      method: "GET",
      path: "/user/search",
      description: "Search users",
      authRequired: true,
      parameters: [
        { name: "query", in: "query", required: true, type: "string" },
        { name: "maxResults", in: "query", required: false, type: "number" },
      ],
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
    events: [
      "jira:issue_created",
      "jira:issue_updated",
      "jira:issue_deleted",
      "jira:issue_transitioned",
    ],
    secretHeader: "X-Hub-Signature",
  },
  metadata: {
    categories: ["project-management", "issue-tracking"],
    tags: ["jira", "atlassian", "issues", "projects", "agile"],
  },
};

export default jiraConfig;
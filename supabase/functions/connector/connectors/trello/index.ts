import type { ConnectorConfig, AuthConfig, RateLimitConfig, PermissionConfig } from "../../types.ts";

export const trelloConfig: ConnectorConfig = {
  type: "trello",
  name: "trello",
  displayName: "Trello",
  description: "Connect to Trello to manage boards, cards, and lists",
  version: "1.0.0",
  auth: {
    type: "oauth2",
    oauth2: {
      authorizationUrl: "https://trello.com/1/authorize",
      tokenUrl: "https://trello.com/1/token",
      clientId: Deno.env.get("TRELLO_API_KEY") || "",
      clientSecret: Deno.env.get("TRELLO_API_SECRET") || "",
      scopes: ["read", "write", "account"],
      redirectUri: Deno.env.get("TRELLO_REDIRECT_URI") || "",
      pkce: false,
    },
  } as AuthConfig,
  baseUrl: "https://api.trello.com/1",
  endpoints: {
    getMember: {
      method: "GET",
      path: "/members/me",
      description: "Get current member",
      authRequired: true,
    },
    // Boards
    getBoards: {
      method: "GET",
      path: "/members/me/boards",
      description: "Get member boards",
      authRequired: true,
      parameters: [
        { name: "filter", in: "query", required: false, type: "string", enum: ["open", "closed", "all"] },
        { name: "fields", in: "query", required: false, type: "string" },
      ],
    },
    getBoard: {
      method: "GET",
      path: "/boards/{id}",
      description: "Get a board",
      authRequired: true,
      parameters: [
        { name: "id", in: "path", required: true, type: "string" },
        { name: "fields", in: "query", required: false, type: "string" },
      ],
    },
    createBoard: {
      method: "POST",
      path: "/boards",
      description: "Create a board",
      authRequired: true,
      requestBody: {
        contentType: "application/json",
        required: true,
        schema: {
          type: "object",
          properties: {
            name: { type: "string" },
            desc: { type: "string" },
            prefs_permissionLevel: { type: "string" },
            defaultLists: { type: "boolean" },
          },
          required: ["name"],
        },
      },
    },
    updateBoard: {
      method: "PUT",
      path: "/boards/{id}",
      description: "Update a board",
      authRequired: true,
      parameters: [
        { name: "id", in: "path", required: true, type: "string" },
      ],
      requestBody: {
        contentType: "application/json",
        required: true,
      },
    },
    deleteBoard: {
      method: "DELETE",
      path: "/boards/{id}",
      description: "Delete a board",
      authRequired: true,
      parameters: [
        { name: "id", in: "path", required: true, type: "string" },
      ],
    },
    // Lists
    getLists: {
      method: "GET",
      path: "/boards/{id}/lists",
      description: "Get board lists",
      authRequired: true,
      parameters: [
        { name: "id", in: "path", required: true, type: "string" },
        { name: "fields", in: "query", required: false, type: "string" },
      ],
    },
    getList: {
      method: "GET",
      path: "/lists/{id}",
      description: "Get a list",
      authRequired: true,
      parameters: [
        { name: "id", in: "path", required: true, type: "string" },
      ],
    },
    createList: {
      method: "POST",
      path: "/lists",
      description: "Create a list",
      authRequired: true,
      requestBody: {
        contentType: "application/json",
        required: true,
        schema: {
          type: "object",
          properties: {
            name: { type: "string" },
            idBoard: { type: "string" },
            pos: { type: "string" },
          },
          required: ["name", "idBoard"],
        },
      },
    },
    updateList: {
      method: "PUT",
      path: "/lists/{id}",
      description: "Update a list",
      authRequired: true,
      parameters: [
        { name: "id", in: "path", required: true, type: "string" },
      ],
      requestBody: {
        contentType: "application/json",
        required: true,
      },
    },
    // Cards
    getCards: {
      method: "GET",
      path: "/boards/{id}/cards",
      description: "Get board cards",
      authRequired: true,
      parameters: [
        { name: "id", in: "path", required: true, type: "string" },
        { name: "filter", in: "query", required: false, type: "string", enum: ["open", "closed", "all"] },
        { name: "fields", in: "query", required: false, type: "string" },
      ],
    },
    getCard: {
      method: "GET",
      path: "/cards/{id}",
      description: "Get a card",
      authRequired: true,
      parameters: [
        { name: "id", in: "path", required: true, type: "string" },
        { name: "fields", in: "query", required: false, type: "string" },
      ],
    },
    createCard: {
      method: "POST",
      path: "/cards",
      description: "Create a card",
      authRequired: true,
      requestBody: {
        contentType: "application/json",
        required: true,
        schema: {
          type: "object",
          properties: {
            name: { type: "string" },
            desc: { type: "string" },
            idList: { type: "string" },
            pos: { type: "string" },
            due: { type: "string" },
            idMembers: { type: "array", items: { type: "string" } },
            idLabels: { type: "array", items: { type: "string" } },
          },
          required: ["name", "idList"],
        },
      },
    },
    updateCard: {
      method: "PUT",
      path: "/cards/{id}",
      description: "Update a card",
      authRequired: true,
      parameters: [
        { name: "id", in: "path", required: true, type: "string" },
      ],
      requestBody: {
        contentType: "application/json",
        required: true,
      },
    },
    deleteCard: {
      method: "DELETE",
      path: "/cards/{id}",
      description: "Delete a card",
      authRequired: true,
      parameters: [
        { name: "id", in: "path", required: true, type: "string" },
      ],
    },
    moveCard: {
      method: "PUT",
      path: "/cards/{id}",
      description: "Move a card",
      authRequired: true,
      parameters: [
        { name: "id", in: "path", required: true, type: "string" },
      ],
      requestBody: {
        contentType: "application/json",
        required: true,
        schema: {
          type: "object",
          properties: {
            idList: { type: "string" },
            pos: { type: "string" },
          },
        },
      },
    },
  },
  rateLimits: {
    requests: 300,
    windowMs: 10000,
  } as RateLimitConfig,
  permissions: {
    scopes: ["read", "write", "account"],
    requiredPermissions: ["read"],
    optionalPermissions: ["write", "account"],
  } as PermissionConfig,
  webhooks: {
    events: [
      "createCard",
      "updateCard",
      "deleteCard",
      "createList",
      "updateList",
      "createBoard",
      "updateBoard",
    ],
    secretHeader: "X-Trello-Webhook",
  },
  metadata: {
    categories: ["project-management", "productivity"],
    tags: ["trello", "boards", "cards", "lists", "kanban"],
  },
};

export default trelloConfig;
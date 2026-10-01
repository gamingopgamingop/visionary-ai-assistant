import type { ConnectorConfig, AuthConfig, OAuth2Config, RateLimitConfig, PermissionConfig } from "../../types.ts";

export const slackConfig: ConnectorConfig = {
  type: "slack",
  name: "slack",
  displayName: "Slack",
  description: "Connect to Slack to manage messages, channels, users, and more",
  version: "1.0.0",
  auth: {
    type: "oauth2",
    oauth2: {
      authorizationUrl: "https://slack.com/oauth/v2/authorize",
      tokenUrl: "https://slack.com/api/oauth.v2.access",
      clientId: Deno.env.get("SLACK_CLIENT_ID") || "",
      clientSecret: Deno.env.get("SLACK_CLIENT_SECRET") || "",
      scopes: [
        "channels:read",
        "channels:write",
        "channels:manage",
        "groups:read",
        "groups:write",
        "im:read",
        "im:write",
        "mpim:read",
        "mpim:write",
        "chat:write",
        "chat:write.public",
        "chat:write.customize",
        "reactions:read",
        "reactions:write",
        "users:read",
        "users:read.email",
        "team:read",
      ],
      redirectUri: Deno.env.get("SLACK_REDIRECT_URI") || "",
      pkce: false,
    },
  } as AuthConfig,
  baseUrl: "https://slack.com/api",
  endpoints: {
    authTest: {
      method: "POST",
      path: "/auth.test",
      description: "Test authentication",
      authRequired: true,
    },
    // Messages
    chatPostMessage: {
      method: "POST",
      path: "/chat.postMessage",
      description: "Post a message",
      authRequired: true,
      requestBody: {
        contentType: "application/json",
        required: true,
        schema: {
          type: "object",
          properties: {
            channel: { type: "string" },
            text: { type: "string" },
            blocks: { type: "array" },
            attachments: { type: "array" },
            thread_ts: { type: "string" },
            reply_broadcast: { type: "boolean" },
          },
          required: ["channel"],
        },
      },
    },
    chatUpdate: {
      method: "POST",
      path: "/chat.update",
      description: "Update a message",
      authRequired: true,
      requestBody: {
        contentType: "application/json",
        required: true,
        schema: {
          type: "object",
          properties: {
            channel: { type: "string" },
            ts: { type: "string" },
            text: { type: "string" },
            blocks: { type: "array" },
          },
          required: ["channel", "ts"],
        },
      },
    },
    chatDelete: {
      method: "POST",
      path: "/chat.delete",
      description: "Delete a message",
      authRequired: true,
      requestBody: {
        contentType: "application/json",
        required: true,
        schema: {
          type: "object",
          properties: {
            channel: { type: "string" },
            ts: { type: "string" },
          },
          required: ["channel", "ts"],
        },
      },
    },
    conversationsHistory: {
      method: "GET",
      path: "/conversations.history",
      description: "Get conversation history",
      authRequired: true,
      parameters: [
        { name: "channel", in: "query", required: true, type: "string" },
        { name: "cursor", in: "query", required: false, type: "string" },
        { name: "limit", in: "query", required: false, type: "number" },
        { name: "latest", in: "query", required: false, type: "string" },
        { name: "oldest", in: "query", required: false, type: "string" },
        { name: "inclusive", in: "query", required: false, type: "boolean" },
      ],
    },
    conversationsReplies: {
      method: "GET",
      path: "/conversations.replies",
      description: "Get thread replies",
      authRequired: true,
      parameters: [
        { name: "channel", in: "query", required: true, type: "string" },
        { name: "ts", in: "query", required: true, type: "string" },
        { name: "cursor", in: "query", required: false, type: "string" },
        { name: "limit", in: "query", required: false, type: "number" },
      ],
    },
    // Channels
    conversationsList: {
      method: "GET",
      path: "/conversations.list",
      description: "List conversations",
      authRequired: true,
      parameters: [
        { name: "cursor", in: "query", required: false, type: "string" },
        { name: "exclude_archived", in: "query", required: false, type: "boolean" },
        { name: "limit", in: "query", required: false, type: "number" },
        { name: "types", in: "query", required: false, type: "string" },
      ],
    },
    conversationsCreate: {
      method: "POST",
      path: "/conversations.create",
      description: "Create a channel",
      authRequired: true,
      requestBody: {
        contentType: "application/json",
        required: true,
        schema: {
          type: "object",
          properties: {
            name: { type: "string" },
            is_private: { type: "boolean" },
          },
          required: ["name"],
        },
      },
    },
    conversationsInfo: {
      method: "GET",
      path: "/conversations.info",
      description: "Get channel info",
      authRequired: true,
      parameters: [
        { name: "channel", in: "query", required: true, type: "string" },
        { name: "include_locale", in: "query", required: false, type: "boolean" },
      ],
    },
    conversationsJoin: {
      method: "POST",
      path: "/conversations.join",
      description: "Join a channel",
      authRequired: true,
      requestBody: {
        contentType: "application/json",
        required: true,
        schema: {
          type: "object",
          properties: {
            channel: { type: "string" },
          },
          required: ["channel"],
        },
      },
    },
    conversationsLeave: {
      method: "POST",
      path: "/conversations.leave",
      description: "Leave a channel",
      authRequired: true,
      requestBody: {
        contentType: "application/json",
        required: true,
        schema: {
          type: "object",
          properties: {
            channel: { type: "string" },
          },
          required: ["channel"],
        },
      },
    },
    conversationsArchive: {
      method: "POST",
      path: "/conversations.archive",
      description: "Archive a channel",
      authRequired: true,
      requestBody: {
        contentType: "application/json",
        required: true,
        schema: {
          type: "object",
          properties: {
            channel: { type: "string" },
          },
          required: ["channel"],
        },
      },
    },
    conversationsUnarchive: {
      method: "POST",
      path: "/conversations.unarchive",
      description: "Unarchive a channel",
      authRequired: true,
      requestBody: {
        contentType: "application/json",
        required: true,
        schema: {
          type: "object",
          properties: {
            channel: { type: "string" },
          },
          required: ["channel"],
        },
      },
    },
    conversationsRename: {
      method: "POST",
      path: "/conversations.rename",
      description: "Rename a channel",
      authRequired: true,
      requestBody: {
        contentType: "application/json",
        required: true,
        schema: {
          type: "object",
          properties: {
            channel: { type: "string" },
            name: { type: "string" },
          },
          required: ["channel", "name"],
        },
      },
    },
    // Users
    usersList: {
      method: "GET",
      path: "/users.list",
      description: "List users",
      authRequired: true,
      parameters: [
        { name: "cursor", in: "query", required: false, type: "string" },
        { name: "limit", in: "query", required: false, type: "number" },
        { name: "include_locale", in: "query", required: false, type: "boolean" },
      ],
    },
    usersInfo: {
      method: "GET",
      path: "/users.info",
      description: "Get user info",
      authRequired: true,
      parameters: [
        { name: "user", in: "query", required: true, type: "string" },
        { name: "include_locale", in: "query", required: false, type: "boolean" },
      ],
    },
    // Reactions
    reactionsAdd: {
      method: "POST",
      path: "/reactions.add",
      description: "Add a reaction",
      authRequired: true,
      requestBody: {
        contentType: "application/json",
        required: true,
        schema: {
          type: "object",
          properties: {
            channel: { type: "string" },
            timestamp: { type: "string" },
            name: { type: "string" },
          },
          required: ["channel", "timestamp", "name"],
        },
      },
    },
    reactionsRemove: {
      method: "POST",
      path: "/reactions.remove",
      description: "Remove a reaction",
      authRequired: true,
      requestBody: {
        contentType: "application/json",
        required: true,
        schema: {
          type: "object",
          properties: {
            channel: { type: "string" },
            timestamp: { type: "string" },
            name: { type: "string" },
          },
          required: ["channel", "timestamp", "name"],
        },
      },
    },
    reactionsList: {
      method: "GET",
      path: "/reactions.list",
      description: "List reactions",
      authRequired: true,
      parameters: [
        { name: "channel", in: "query", required: false, type: "string" },
        { name: "timestamp", in: "query", required: false, type: "string" },
        { name: "cursor", in: "query", required: false, type: "string" },
        { name: "limit", in: "query", required: false, type: "number" },
      ],
    },
  },
  rateLimits: {
    requests: 100,
    windowMs: 60000,
  } as RateLimitConfig,
  permissions: {
    scopes: [
      "channels:read",
      "channels:write",
      "groups:read",
      "groups:write",
      "chat:write",
      "users:read",
      "reactions:read",
      "reactions:write",
    ],
    requiredPermissions: ["channels:read", "chat:write"],
    optionalPermissions: [
      "channels:manage",
      "groups:write",
      "im:read",
      "im:write",
      "mpim:read",
      "mpim:write",
      "chat:write.public",
      "chat:write.customize",
      "users:read.email",
      "team:read",
    ],
  } as PermissionConfig,
  webhooks: {
    events: [
      "message.channels",
      "message.groups",
      "message.im",
      "message.mpim",
      "reaction_added",
      "reaction_removed",
      "channel_created",
      "channel_renamed",
      "channel_archived",
      "channel_unarchived",
      "member_joined_channel",
      "member_left_channel",
    ],
    secretHeader: "X-Slack-Signature",
  },
  metadata: {
    categories: ["communication", "collaboration"],
    tags: ["slack", "messaging", "channels", "teams"],
  },
};

export default slackConfig;
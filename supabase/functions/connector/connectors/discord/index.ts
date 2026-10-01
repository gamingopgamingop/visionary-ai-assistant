import type { ConnectorConfig, AuthConfig, OAuth2Config, RateLimitConfig, PermissionConfig } from "../../types.ts";

export const discordConfig: ConnectorConfig = {
  type: "discord",
  name: "discord",
  displayName: "Discord",
  description: "Connect to Discord to manage messages, servers, and users",
  version: "1.0.0",
  auth: {
    type: "oauth2",
    oauth2: {
      authorizationUrl: "https://discord.com/oauth2/authorize",
      tokenUrl: "https://discord.com/api/oauth2/token",
      clientId: Deno.env.get("DISCORD_CLIENT_ID") || "",
      clientSecret: Deno.env.get("DISCORD_CLIENT_SECRET") || "",
      scopes: [
        "identify",
        "guilds",
        "guilds.members.read",
        "channels.read",
        "messages.read",
        "messages.write",
      ],
      redirectUri: Deno.env.get("DISCORD_REDIRECT_URI") || "",
      pkce: true,
    },
  } as AuthConfig,
  baseUrl: "https://discord.com/api/v10",
  endpoints: {
    getCurrentUser: {
      method: "GET",
      path: "/users/@me",
      description: "Get current user",
      authRequired: true,
    },
    // Messages
    createMessage: {
      method: "POST",
      path: "/channels/{channel_id}/messages",
      description: "Create a message",
      authRequired: true,
      parameters: [
        { name: "channel_id", in: "path", required: true, type: "string" },
      ],
      requestBody: {
        contentType: "application/json",
        required: true,
        schema: {
          type: "object",
          properties: {
            content: { type: "string" },
            embeds: { type: "array" },
            components: { type: "array" },
            tts: { type: "boolean" },
            allowed_mentions: { type: "object" },
            message_reference: { type: "object" },
          },
        },
      },
    },
    getChannelMessages: {
      method: "GET",
      path: "/channels/{channel_id}/messages",
      description: "Get channel messages",
      authRequired: true,
      parameters: [
        { name: "channel_id", in: "path", required: true, type: "string" },
        { name: "limit", in: "query", required: false, type: "number" },
        { name: "before", in: "query", required: false, type: "string" },
        { name: "after", in: "query", required: false, type: "string" },
        { name: "around", in: "query", required: false, type: "string" },
      ],
    },
    getMessage: {
      method: "GET",
      path: "/channels/{channel_id}/messages/{message_id}",
      description: "Get a message",
      authRequired: true,
      parameters: [
        { name: "channel_id", in: "path", required: true, type: "string" },
        { name: "message_id", in: "path", required: true, type: "string" },
      ],
    },
    updateMessage: {
      method: "PATCH",
      path: "/channels/{channel_id}/messages/{message_id}",
      description: "Update a message",
      authRequired: true,
      parameters: [
        { name: "channel_id", in: "path", required: true, type: "string" },
        { name: "message_id", in: "path", required: true, type: "string" },
      ],
      requestBody: {
        contentType: "application/json",
        required: true,
        schema: {
          type: "object",
          properties: {
            content: { type: "string" },
            embeds: { type: "array" },
            components: { type: "array" },
            allowed_mentions: { type: "object" },
          },
        },
      },
    },
    deleteMessage: {
      method: "DELETE",
      path: "/channels/{channel_id}/messages/{message_id}",
      description: "Delete a message",
      authRequired: true,
      parameters: [
        { name: "channel_id", in: "path", required: true, type: "string" },
        { name: "message_id", in: "path", required: true, type: "string" },
      ],
    },
    // Channels
    getChannel: {
      method: "GET",
      path: "/channels/{channel_id}",
      description: "Get a channel",
      authRequired: true,
      parameters: [
        { name: "channel_id", in: "path", required: true, type: "string" },
      ],
    },
    modifyChannel: {
      method: "PATCH",
      path: "/channels/{channel_id}",
      description: "Modify a channel",
      authRequired: true,
      parameters: [
        { name: "channel_id", in: "path", required: true, type: "string" },
      ],
      requestBody: {
        contentType: "application/json",
        required: true,
      },
    },
    deleteChannel: {
      method: "DELETE",
      path: "/channels/{channel_id}",
      description: "Delete a channel",
      authRequired: true,
      parameters: [
        { name: "channel_id", in: "path", required: true, type: "string" },
      ],
    },
    // Guilds (Servers)
    getCurrentUserGuilds: {
      method: "GET",
      path: "/users/@me/guilds",
      description: "Get current user's guilds",
      authRequired: true,
      parameters: [
        { name: "limit", in: "query", required: false, type: "number" },
        { name: "before", in: "query", required: false, type: "string" },
        { name: "after", in: "query", required: false, type: "string" },
      ],
    },
    getGuild: {
      method: "GET",
      path: "/guilds/{guild_id}",
      description: "Get a guild",
      authRequired: true,
      parameters: [
        { name: "guild_id", in: "path", required: true, type: "string" },
      ],
    },
    getGuildChannels: {
      method: "GET",
      path: "/guilds/{guild_id}/channels",
      description: "Get guild channels",
      authRequired: true,
      parameters: [
        { name: "guild_id", in: "path", required: true, type: "string" },
      ],
    },
    createGuildChannel: {
      method: "POST",
      path: "/guilds/{guild_id}/channels",
      description: "Create a guild channel",
      authRequired: true,
      parameters: [
        { name: "guild_id", in: "path", required: true, type: "string" },
      ],
      requestBody: {
        contentType: "application/json",
        required: true,
        schema: {
          type: "object",
          properties: {
            name: { type: "string" },
            type: { type: "number" },
            topic: { type: "string" },
            bitrate: { type: "number" },
            user_limit: { type: "number" },
            rate_limit_per_user: { type: "number" },
            position: { type: "number" },
            permission_overwrites: { type: "array" },
            parent_id: { type: "string" },
            nsfw: { type: "boolean" },
          },
          required: ["name"],
        },
      },
    },
    getGuildMembers: {
      method: "GET",
      path: "/guilds/{guild_id}/members",
      description: "List guild members",
      authRequired: true,
      parameters: [
        { name: "guild_id", in: "path", required: true, type: "string" },
        { name: "limit", in: "query", required: false, type: "number" },
        { name: "after", in: "query", required: false, type: "string" },
      ],
    },
    getGuildMember: {
      method: "GET",
      path: "/guilds/{guild_id}/members/{user_id}",
      description: "Get a guild member",
      authRequired: true,
      parameters: [
        { name: "guild_id", in: "path", required: true, type: "string" },
        { name: "user_id", in: "path", required: true, type: "string" },
      ],
    },
    // Users
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
    requests: 50,
    windowMs: 1000,
  } as RateLimitConfig,
  permissions: {
    scopes: ["identify", "guilds", "guilds.members.read", "channels.read", "messages.read", "messages.write"],
    requiredPermissions: ["identify"],
    optionalPermissions: ["guilds", "guilds.members.read", "channels.read", "messages.read", "messages.write"],
  } as PermissionConfig,
  webhooks: {
    events: [
      "MESSAGE_CREATE",
      "MESSAGE_UPDATE",
      "MESSAGE_DELETE",
      "CHANNEL_CREATE",
      "CHANNEL_UPDATE",
      "CHANNEL_DELETE",
      "GUILD_CREATE",
      "GUILD_UPDATE",
      "GUILD_DELETE",
      "GUILD_MEMBER_ADD",
      "GUILD_MEMBER_REMOVE",
      "GUILD_MEMBER_UPDATE",
    ],
    secretHeader: "X-Signature-Ed25519",
  },
  metadata: {
    categories: ["communication", "community"],
    tags: ["discord", "chat", "servers", "messages", "gaming"],
  },
};

export default discordConfig;
import type { ConnectorConfig, AuthConfig, OAuth2Config, RateLimitConfig, PermissionConfig } from "../../types.ts";

export const microsoftConfig: ConnectorConfig = {
  type: "microsoft",
  name: "microsoft",
  displayName: "Microsoft 365",
  description: "Connect to Microsoft 365 services including Outlook, OneDrive, Calendar, and Teams",
  version: "1.0.0",
  auth: {
    type: "oauth2",
    oauth2: {
      authorizationUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
      tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      clientId: Deno.env.get("MICROSOFT_CLIENT_ID") || "",
      clientSecret: Deno.env.get("MICROSOFT_CLIENT_SECRET") || "",
      scopes: [
        "https://graph.microsoft.com/User.Read",
        "https://graph.microsoft.com/Mail.Read",
        "https://graph.microsoft.com/Mail.Send",
        "https://graph.microsoft.com/Calendars.Read",
        "https://graph.microsoft.com/Calendars.ReadWrite",
        "https://graph.microsoft.com/Files.Read",
        "https://graph.microsoft.com/Files.ReadWrite",
        "https://graph.microsoft.com/Team.ReadBasic.All",
        "https://graph.microsoft.com/Channel.ReadBasic.All",
      ],
      redirectUri: Deno.env.get("MICROSOFT_REDIRECT_URI") || "",
      pkce: true,
    },
  } as AuthConfig,
  baseUrl: "https://graph.microsoft.com/v1.0",
  endpoints: {
    getUser: {
      method: "GET",
      path: "/me",
      description: "Get current user",
      authRequired: true,
    },
    // Outlook/Mail
    mailListMessages: {
      method: "GET",
      path: "/me/messages",
      description: "List mail messages",
      authRequired: true,
      parameters: [
        { name: "$top", in: "query", required: false, type: "number" },
        { name: "$skip", in: "query", required: false, type: "number" },
        { name: "$filter", in: "query", required: false, type: "string" },
        { name: "$orderby", in: "query", required: false, type: "string" },
        { name: "$select", in: "query", required: false, type: "string" },
      ],
    },
    mailGetMessage: {
      method: "GET",
      path: "/me/messages/{id}",
      description: "Get mail message",
      authRequired: true,
      parameters: [
        { name: "id", in: "path", required: true, type: "string" },
      ],
    },
    mailSendMessage: {
      method: "POST",
      path: "/me/sendMail",
      description: "Send mail message",
      authRequired: true,
      requestBody: {
        contentType: "application/json",
        required: true,
      },
    },
    mailCreateDraft: {
      method: "POST",
      path: "/me/messages",
      description: "Create mail draft",
      authRequired: true,
      requestBody: {
        contentType: "application/json",
        required: true,
      },
    },
    // OneDrive
    driveListItems: {
      method: "GET",
      path: "/me/drive/root/children",
      description: "List OneDrive items",
      authRequired: true,
      parameters: [
        { name: "$top", in: "query", required: false, type: "number" },
        { name: "$skip", in: "query", required: false, type: "number" },
        { name: "$filter", in: "query", required: false, type: "string" },
        { name: "$orderby", in: "query", required: false, type: "string" },
      ],
    },
    driveGetItem: {
      method: "GET",
      path: "/me/drive/items/{itemId}",
      description: "Get OneDrive item",
      authRequired: true,
      parameters: [
        { name: "itemId", in: "path", required: true, type: "string" },
      ],
    },
    driveCreateItem: {
      method: "POST",
      path: "/me/drive/root/children",
      description: "Create OneDrive item",
      authRequired: true,
      requestBody: {
        contentType: "application/json",
        required: true,
      },
    },
    driveUpdateItem: {
      method: "PATCH",
      path: "/me/drive/items/{itemId}",
      description: "Update OneDrive item",
      authRequired: true,
      parameters: [
        { name: "itemId", in: "path", required: true, type: "string" },
      ],
      requestBody: {
        contentType: "application/json",
        required: true,
      },
    },
    driveDeleteItem: {
      method: "DELETE",
      path: "/me/drive/items/{itemId}",
      description: "Delete OneDrive item",
      authRequired: true,
      parameters: [
        { name: "itemId", in: "path", required: true, type: "string" },
      ],
    },
    // Calendar
    calendarListEvents: {
      method: "GET",
      path: "/me/events",
      description: "List calendar events",
      authRequired: true,
      parameters: [
        { name: "$top", in: "query", required: false, type: "number" },
        { name: "$skip", in: "query", required: false, type: "number" },
        { name: "$filter", in: "query", required: false, type: "string" },
        { name: "$orderby", in: "query", required: false, type: "string" },
        { name: "$select", in: "query", required: false, type: "string" },
      ],
    },
    calendarGetEvent: {
      method: "GET",
      path: "/me/events/{id}",
      description: "Get calendar event",
      authRequired: true,
      parameters: [
        { name: "id", in: "path", required: true, type: "string" },
      ],
    },
    calendarCreateEvent: {
      method: "POST",
      path: "/me/events",
      description: "Create calendar event",
      authRequired: true,
      requestBody: {
        contentType: "application/json",
        required: true,
      },
    },
    calendarUpdateEvent: {
      method: "PATCH",
      path: "/me/events/{id}",
      description: "Update calendar event",
      authRequired: true,
      parameters: [
        { name: "id", in: "path", required: true, type: "string" },
      ],
      requestBody: {
        contentType: "application/json",
        required: true,
      },
    },
    calendarDeleteEvent: {
      method: "DELETE",
      path: "/me/events/{id}",
      description: "Delete calendar event",
      authRequired: true,
      parameters: [
        { name: "id", in: "path", required: true, type: "string" },
      ],
    },
    // Teams
    teamsListTeams: {
      method: "GET",
      path: "/me/joinedTeams",
      description: "List joined teams",
      authRequired: true,
    },
    teamsGetTeam: {
      method: "GET",
      path: "/teams/{teamId}",
      description: "Get team",
      authRequired: true,
      parameters: [
        { name: "teamId", in: "path", required: true, type: "string" },
      ],
    },
    teamsListChannels: {
      method: "GET",
      path: "/teams/{teamId}/channels",
      description: "List team channels",
      authRequired: true,
      parameters: [
        { name: "teamId", in: "path", required: true, type: "string" },
      ],
    },
    teamsGetChannel: {
      method: "GET",
      path: "/teams/{teamId}/channels/{channelId}",
      description: "Get channel",
      authRequired: true,
      parameters: [
        { name: "teamId", in: "path", required: true, type: "string" },
        { name: "channelId", in: "path", required: true, type: "string" },
      ],
    },
    teamsSendMessage: {
      method: "POST",
      path: "/teams/{teamId}/channels/{channelId}/messages",
      description: "Send channel message",
      authRequired: true,
      parameters: [
        { name: "teamId", in: "path", required: true, type: "string" },
        { name: "channelId", in: "path", required: true, type: "string" },
      ],
      requestBody: {
        contentType: "application/json",
        required: true,
      },
    },
  },
  rateLimits: {
    requests: 10000,
    windowMs: 60000,
  } as RateLimitConfig,
  permissions: {
    scopes: [
      "https://graph.microsoft.com/User.Read",
      "https://graph.microsoft.com/Mail.Read",
      "https://graph.microsoft.com/Mail.Send",
      "https://graph.microsoft.com/Calendars.Read",
      "https://graph.microsoft.com/Calendars.ReadWrite",
      "https://graph.microsoft.com/Files.Read",
      "https://graph.microsoft.com/Files.ReadWrite",
      "https://graph.microsoft.com/Team.ReadBasic.All",
      "https://graph.microsoft.com/Channel.ReadBasic.All",
    ],
    requiredPermissions: ["https://graph.microsoft.com/User.Read"],
    optionalPermissions: [
      "https://graph.microsoft.com/Mail.Read",
      "https://graph.microsoft.com/Mail.Send",
      "https://graph.microsoft.com/Calendars.Read",
      "https://graph.microsoft.com/Calendars.ReadWrite",
      "https://graph.microsoft.com/Files.Read",
      "https://graph.microsoft.com/Files.ReadWrite",
      "https://graph.microsoft.com/Team.ReadBasic.All",
      "https://graph.microsoft.com/Channel.ReadBasic.All",
    ],
  } as PermissionConfig,
  webhooks: {
    events: [
      "mail.received",
      "mail.updated",
      "calendar.event.created",
      "calendar.event.updated",
      "calendar.event.deleted",
      "drive.item.created",
      "drive.item.updated",
      "drive.item.deleted",
    ],
    secretHeader: "Validation-Token",
  },
  metadata: {
    categories: ["productivity", "communication", "storage"],
    tags: ["microsoft", "office365", "outlook", "onedrive", "calendar", "teams"],
  },
};

export default microsoftConfig;
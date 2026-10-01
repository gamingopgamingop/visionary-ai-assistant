import type { ConnectorConfig, AuthConfig, OAuth2Config, RateLimitConfig, PermissionConfig } from "../../types.ts";

export const googleConfig: ConnectorConfig = {
  type: "google",
  name: "google",
  displayName: "Google Workspace",
  description: "Connect to Google Workspace services including Gmail, Drive, Calendar, Sheets, and Docs",
  version: "1.0.0",
  auth: {
    type: "oauth2",
    oauth2: {
      authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      clientId: Deno.env.get("GOOGLE_CLIENT_ID") || "",
      clientSecret: Deno.env.get("GOOGLE_CLIENT_SECRET") || "",
      scopes: [
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/gmail.send",
        "https://www.googleapis.com/auth/drive",
        "https://www.googleapis.com/auth/calendar",
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/documents",
      ],
      redirectUri: Deno.env.get("GOOGLE_REDIRECT_URI") || "",
      pkce: true,
    },
  } as AuthConfig,
  baseUrl: "https://www.googleapis.com",
  endpoints: {
    getUserInfo: {
      method: "GET",
      path: "/oauth2/v2/userinfo",
      description: "Get user info",
      authRequired: true,
    },
    // Gmail
    gmailListMessages: {
      method: "GET",
      path: "/gmail/v1/users/me/messages",
      description: "List Gmail messages",
      authRequired: true,
      parameters: [
        { name: "q", in: "query", required: false, type: "string" },
        { name: "labelIds", in: "query", required: false, type: "string" },
        { name: "maxResults", in: "query", required: false, type: "number" },
        { name: "pageToken", in: "query", required: false, type: "string" },
      ],
    },
    gmailGetMessage: {
      method: "GET",
      path: "/gmail/v1/users/me/messages/{id}",
      description: "Get Gmail message",
      authRequired: true,
      parameters: [
        { name: "id", in: "path", required: true, type: "string" },
        { name: "format", in: "query", required: false, type: "string", enum: ["full", "metadata", "minimal", "raw"] },
      ],
    },
    gmailSendMessage: {
      method: "POST",
      path: "/gmail/v1/users/me/messages/send",
      description: "Send Gmail message",
      authRequired: true,
      requestBody: {
        contentType: "application/json",
        required: true,
        schema: {
          type: "object",
          properties: {
            raw: { type: "string" },
          },
          required: ["raw"],
        },
      },
    },
    // Drive
    driveListFiles: {
      method: "GET",
      path: "/drive/v3/files",
      description: "List Drive files",
      authRequired: true,
      parameters: [
        { name: "q", in: "query", required: false, type: "string" },
        { name: "pageSize", in: "query", required: false, type: "number" },
        { name: "pageToken", in: "query", required: false, type: "string" },
        { name: "orderBy", in: "query", required: false, type: "string" },
        { name: "fields", in: "query", required: false, type: "string" },
      ],
    },
    driveGetFile: {
      method: "GET",
      path: "/drive/v3/files/{fileId}",
      description: "Get Drive file",
      authRequired: true,
      parameters: [
        { name: "fileId", in: "path", required: true, type: "string" },
        { name: "fields", in: "query", required: false, type: "string" },
      ],
    },
    driveCreateFile: {
      method: "POST",
      path: "/drive/v3/files",
      description: "Create Drive file",
      authRequired: true,
      requestBody: {
        contentType: "application/json",
        required: true,
        schema: {
          type: "object",
          properties: {
            name: { type: "string" },
            mimeType: { type: "string" },
            parents: { type: "array", items: { type: "string" } },
          },
          required: ["name"],
        },
      },
    },
    driveUpdateFile: {
      method: "PATCH",
      path: "/drive/v3/files/{fileId}",
      description: "Update Drive file",
      authRequired: true,
      parameters: [
        { name: "fileId", in: "path", required: true, type: "string" },
      ],
      requestBody: {
        contentType: "application/json",
        required: true,
      },
    },
    driveDeleteFile: {
      method: "DELETE",
      path: "/drive/v3/files/{fileId}",
      description: "Delete Drive file",
      authRequired: true,
      parameters: [
        { name: "fileId", in: "path", required: true, type: "string" },
      ],
    },
    // Calendar
    calendarListEvents: {
      method: "GET",
      path: "/calendar/v3/calendars/{calendarId}/events",
      description: "List Calendar events",
      authRequired: true,
      parameters: [
        { name: "calendarId", in: "path", required: true, type: "string" },
        { name: "timeMin", in: "query", required: false, type: "string" },
        { name: "timeMax", in: "query", required: false, type: "string" },
        { name: "maxResults", in: "query", required: false, type: "number" },
        { name: "singleEvents", in: "query", required: false, type: "boolean" },
        { name: "orderBy", in: "query", required: false, type: "string" },
        { name: "pageToken", in: "query", required: false, type: "string" },
      ],
    },
    calendarGetEvent: {
      method: "GET",
      path: "/calendar/v3/calendars/{calendarId}/events/{eventId}",
      description: "Get Calendar event",
      authRequired: true,
      parameters: [
        { name: "calendarId", in: "path", required: true, type: "string" },
        { name: "eventId", in: "path", required: true, type: "string" },
      ],
    },
    calendarCreateEvent: {
      method: "POST",
      path: "/calendar/v3/calendars/{calendarId}/events",
      description: "Create Calendar event",
      authRequired: true,
      parameters: [
        { name: "calendarId", in: "path", required: true, type: "string" },
      ],
      requestBody: {
        contentType: "application/json",
        required: true,
      },
    },
    calendarUpdateEvent: {
      method: "PUT",
      path: "/calendar/v3/calendars/{calendarId}/events/{eventId}",
      description: "Update Calendar event",
      authRequired: true,
      parameters: [
        { name: "calendarId", in: "path", required: true, type: "string" },
        { name: "eventId", in: "path", required: true, type: "string" },
      ],
      requestBody: {
        contentType: "application/json",
        required: true,
      },
    },
    calendarDeleteEvent: {
      method: "DELETE",
      path: "/calendar/v3/calendars/{calendarId}/events/{eventId}",
      description: "Delete Calendar event",
      authRequired: true,
      parameters: [
        { name: "calendarId", in: "path", required: true, type: "string" },
        { name: "eventId", in: "path", required: true, type: "string" },
      ],
    },
    // Sheets
    sheetsGetSpreadsheet: {
      method: "GET",
      path: "/sheets/v4/spreadsheets/{spreadsheetId}",
      description: "Get spreadsheet",
      authRequired: true,
      parameters: [
        { name: "spreadsheetId", in: "path", required: true, type: "string" },
        { name: "ranges", in: "query", required: false, type: "string" },
        { name: "includeGridData", in: "query", required: false, type: "boolean" },
      ],
    },
    sheetsGetValues: {
      method: "GET",
      path: "/sheets/v4/spreadsheets/{spreadsheetId}/values/{range}",
      description: "Get sheet values",
      authRequired: true,
      parameters: [
        { name: "spreadsheetId", in: "path", required: true, type: "string" },
        { name: "range", in: "path", required: true, type: "string" },
        { name: "majorDimension", in: "query", required: false, type: "string", enum: ["ROWS", "COLUMNS"] },
        { name: "valueRenderOption", in: "query", required: false, type: "string", enum: ["FORMATTED_VALUE", "UNFORMATTED_VALUE", "FORMULA"] },
      ],
    },
    sheetsUpdateValues: {
      method: "PUT",
      path: "/sheets/v4/spreadsheets/{spreadsheetId}/values/{range}",
      description: "Update sheet values",
      authRequired: true,
      parameters: [
        { name: "spreadsheetId", in: "path", required: true, type: "string" },
        { name: "range", in: "path", required: true, type: "string" },
        { name: "valueInputOption", in: "query", required: true, type: "string", enum: ["RAW", "USER_ENTERED"] },
      ],
      requestBody: {
        contentType: "application/json",
        required: true,
        schema: {
          type: "object",
          properties: {
            values: { type: "array", items: { type: "array", items: { type: "string" } } },
            majorDimension: { type: "string", enum: ["ROWS", "COLUMNS"] },
          },
          required: ["values"],
        },
      },
    },
    sheetsAppendValues: {
      method: "POST",
      path: "/sheets/v4/spreadsheets/{spreadsheetId}/values/{range}:append",
      description: "Append sheet values",
      authRequired: true,
      parameters: [
        { name: "spreadsheetId", in: "path", required: true, type: "string" },
        { name: "range", in: "path", required: true, type: "string" },
        { name: "valueInputOption", in: "query", required: true, type: "string", enum: ["RAW", "USER_ENTERED"] },
        { name: "insertDataOption", in: "query", required: false, type: "string", enum: ["OVERWRITE", "INSERT_ROWS"] },
      ],
      requestBody: {
        contentType: "application/json",
        required: true,
        schema: {
          type: "object",
          properties: {
            values: { type: "array", items: { type: "array", items: { type: "string" } } },
            majorDimension: { type: "string", enum: ["ROWS", "COLUMNS"] },
          },
          required: ["values"],
        },
      },
    },
    // Docs
    docsGetDocument: {
      method: "GET",
      path: "/docs/v1/documents/{documentId}",
      description: "Get document",
      authRequired: true,
      parameters: [
        { name: "documentId", in: "path", required: true, type: "string" },
      ],
    },
    docsCreateDocument: {
      method: "POST",
      path: "/docs/v1/documents",
      description: "Create document",
      authRequired: true,
      requestBody: {
        contentType: "application/json",
        required: true,
        schema: {
          type: "object",
          properties: {
            title: { type: "string" },
          },
          required: ["title"],
        },
      },
    },
    docsBatchUpdate: {
      method: "POST",
      path: "/docs/v1/documents/{documentId}:batchUpdate",
      description: "Batch update document",
      authRequired: true,
      parameters: [
        { name: "documentId", in: "path", required: true, type: "string" },
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
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/drive",
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/documents",
    ],
    requiredPermissions: [
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
    ],
    optionalPermissions: [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/drive",
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/documents",
    ],
  } as PermissionConfig,
  webhooks: {
    events: [
      "gmail.message.created",
      "gmail.message.updated",
      "drive.file.created",
      "drive.file.updated",
      "drive.file.deleted",
      "calendar.event.created",
      "calendar.event.updated",
      "calendar.event.deleted",
    ],
    secretHeader: "X-Goog-Channel-Token",
  },
  metadata: {
    categories: ["productivity", "communication", "storage"],
    tags: ["google", "workspace", "gmail", "drive", "calendar", "sheets", "docs"],
  },
};

export default googleConfig;
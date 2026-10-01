import { createClient } from "@supabase/supabase-js";
import { createClerkClient } from "npm:@clerk/backend@latest";
import { connectorRegistry } from "./core/connector-registry.ts";
import { connectorManager } from "./core/connector-manager.ts";
import { oauthManager } from "./core/oauth-manager.ts";
import { tokenManager } from "./core/token-manager.ts";
import { permissionManager } from "./core/permission-manager.ts";
import { rateLimiter } from "./core/rate-limiter.ts";
import { logger } from "./logger.ts";
import { ConnectorError, formatErrorResponse, getErrorStatusCode } from "./errors.ts";
import { githubConfig } from "./connectors/github/index.ts";
import { createGitHubClient } from "./connectors/github/client.ts";
import { googleConfig } from "./connectors/google/index.ts";
import { createGoogleClient } from "./connectors/google/client.ts";
import { microsoftConfig } from "./connectors/microsoft/index.ts";
import { createMicrosoftClient } from "./connectors/microsoft/client.ts";
import { slackConfig } from "./connectors/slack/index.ts";
import { createSlackClient } from "./connectors/slack/client.ts";
import { discordConfig } from "./connectors/discord/index.ts";
import { createDiscordClient } from "./connectors/discord/client.ts";
import { notionConfig } from "./connectors/notion/index.ts";
import { createNotionClient } from "./connectors/notion/client.ts";
import { trelloConfig } from "./connectors/trello/index.ts";
import { createTrelloClient } from "./connectors/trello/client.ts";
import { jiraConfig } from "./connectors/jira/index.ts";
import { createJiraClient } from "./connectors/jira/client.ts";
import { linearConfig } from "./connectors/linear/index.ts";
import { createLinearClient } from "./connectors/linear/client.ts";
import { supabaseConfig } from "./connectors/supabase/index.ts";
import { createSupabaseClient } from "./connectors/supabase/client.ts";
import { stripeConfig } from "./connectors/stripe/index.ts";
import { createStripeClient } from "./connectors/stripe/client.ts";
import { webhooksConfig } from "./connectors/webhooks/index.ts";
import { genericConfig } from "./connectors/generic/index.ts";
import { createGenericClient } from "./connectors/generic/client.ts";
import type { ConnectorType, ConnectorInstance, ConnectorResult } from "./types.ts";

const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const clerk = createClerkClient({
  secretKey: Deno.env.get("CLERK_SECRET_KEY")!,
  publishableKey: Deno.env.get("CLERK_PUBLISHABLE_KEY")!,
});

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function authenticate(req: Request): Promise<string | null> {
  const apiKey = req.headers.get("x-api-key");
  if (apiKey) {
    const { data, error } = await sb
      .from("api_keys")
      .select("clerk_user_id")
      .eq("key_hash", await sha256(apiKey))
      .eq("revoked", false)
      .maybeSingle();
    if (error) {
      console.error("API key lookup failed:", error);
      return null;
    }
    return data?.clerk_user_id ?? null;
  }

  const authorization = req.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  try {
    const { isAuthenticated, toAuth } = await clerk.authenticateRequest(req);
    if (!isAuthenticated) return null;
    const auth = toAuth();
    return auth.userId ?? null;
  } catch (error) {
    console.error("Clerk authentication failed:", error);
    return null;
  }
}

function registerConnectors(): void {
  connectorRegistry.register("github", createGitHubClient, githubConfig);
  connectorRegistry.register("google", createGoogleClient, googleConfig);
  connectorRegistry.register("microsoft", createMicrosoftClient, microsoftConfig);
  connectorRegistry.register("slack", createSlackClient, slackConfig);
  connectorRegistry.register("discord", createDiscordClient, discordConfig);
  connectorRegistry.register("notion", createNotionClient, notionConfig);
  connectorRegistry.register("trello", createTrelloClient, trelloConfig);
  connectorRegistry.register("jira", createJiraClient, jiraConfig);
  connectorRegistry.register("linear", createLinearClient, linearConfig);
  connectorRegistry.register("supabase", (config, credentials) => createSupabaseClient(config, credentials, Deno.env.get("SUPABASE_PROJECT_REF") || ""), supabaseConfig);
  connectorRegistry.register("stripe", createStripeClient, stripeConfig);
  connectorRegistry.register("webhook", createGenericClient, webhooksConfig);
  connectorRegistry.register("generic", createGenericClient, genericConfig);
}

registerConnectors();

async function handleRequest(req: Request): Promise<Response> {
  const requestId = crypto.randomUUID();
  const reqLogger = logger.child({ requestId });

  const corsHeaders: Record<string, string> = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const userId = await authenticate(req);
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  
  try {
    await rateLimiter.checkConnectorLimit(userId, "api");

    if (pathParts[0] === "connectors") {
      return await handleConnectorsRoute(req, userId, pathParts.slice(1), reqLogger);
    }

    if (pathParts[0] === "oauth") {
      return await handleOAuthRoute(req, userId, pathParts.slice(1), reqLogger);
    }

    if (pathParts[0] === "webhooks") {
      return await handleWebhooksRoute(req, pathParts.slice(1), reqLogger);
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    reqLogger.error("Request failed", {}, error as Error);
    const statusCode = getErrorStatusCode(error);
    return new Response(JSON.stringify(formatErrorResponse(error)), {
      status: statusCode,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}

async function handleConnectorsRoute(
  req: Request,
  userId: string,
  parts: string[],
  reqLogger: ReturnType<typeof logger.child>,
): Promise<Response> {
  const corsHeaders: Record<string, string> = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
  };

  if (parts.length === 0) {
    if (req.method === "GET") {
      const instances = await connectorManager.getUserInstances(userId);
      return new Response(JSON.stringify({ success: true, data: instances }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (req.method === "POST") {
      const body = await req.json();
      const { connectorType, name, credentials, metadata } = body;
      const instance = await connectorManager.createInstance(userId, connectorType, name, credentials, metadata);
      return new Response(JSON.stringify({ success: true, data: instance }), {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  if (parts.length === 1) {
    const instanceId = parts[0];
    
    if (req.method === "GET") {
      const instance = await connectorManager.getInstance(instanceId);
      if (!instance || instance.userId !== userId) {
        return new Response(JSON.stringify({ error: "Not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: true, data: instance }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "PATCH") {
      const body = await req.json();
      const instance = await connectorManager.updateInstance(instanceId, body);
      return new Response(JSON.stringify({ success: true, data: instance }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "DELETE") {
      await connectorManager.deleteInstance(instanceId);
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  if (parts.length >= 2 && parts[1] === "actions") {
    const instanceId = parts[0];
    const action = parts[2];
    const body = req.method !== "GET" ? await req.json() : {};
    
    const result = await connectorManager.executeAction(instanceId, action, body);
    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (parts.length >= 2 && parts[1] === "test") {
    const instanceId = parts[0];
    const result = await connectorManager.testConnection(instanceId);
    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ error: "Not found" }), {
    status: 404,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handleOAuthRoute(
  req: Request,
  userId: string,
  parts: string[],
  reqLogger: ReturnType<typeof logger.child>,
): Promise<Response> {
  const corsHeaders: Record<string, string> = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
  };

  if (parts[0] === "authorize" && req.method === "POST") {
    const body = await req.json();
    const { connectorType, redirectUri, scopes } = body;
    const { authorizationUrl, state } = await oauthManager.initiateOAuthFlow(
      userId,
      connectorType as ConnectorType,
      connectorRegistry.getConfig(connectorType as ConnectorType).auth,
      redirectUri,
      scopes,
    );
    return new Response(JSON.stringify({ authorizationUrl, state }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (parts[0] === "callback" && req.method === "GET") {
    const state = url.searchParams.get("state");
    const code = url.searchParams.get("code");
    if (!state || !code) {
      return new Response(JSON.stringify({ error: "Missing state or code" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const result = await oauthManager.handleOAuthCallback(state, code);
    return new Response(JSON.stringify({ success: true, data: result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (parts[0] === "refresh" && req.method === "POST") {
    const body = await req.json();
    const { connectorType } = body;
    const tokenData = await tokenManager.refreshToken(userId, connectorType as ConnectorType);
    return new Response(JSON.stringify({ success: true, data: tokenData }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (parts[0] === "revoke" && req.method === "POST") {
    const body = await req.json();
    const { connectorType } = body;
    await oauthManager.revokeAccess(userId, connectorType as ConnectorType);
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ error: "Not found" }), {
    status: 404,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handleWebhooksRoute(
  req: Request,
  parts: string[],
  reqLogger: ReturnType<typeof logger.child>,
): Promise<Response> {
  const corsHeaders: Record<string, string> = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
  };

  const connectorType = parts[0] as ConnectorType;
  const payload = await req.text();
  const signature = req.headers.get("x-hub-signature-256") || 
                    req.headers.get("stripe-signature") || 
                    req.headers.get("x-slack-signature") ||
                    req.headers.get("x-signature-ed25519") ||
                    "";

  try {
    const { verifyAndHandleWebhook } = await import("./connectors/webhooks/generic.ts");
    const secret = Deno.env.get(`${connectorType.toUpperCase()}_WEBHOOK_SECRET`) || "";
    const result = await verifyAndHandleWebhook(connectorType, payload, signature, secret);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    reqLogger.error("Webhook handling failed", { connectorType }, error as Error);
    return new Response(JSON.stringify({ success: false, error: (error as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}

Deno.serve(handleRequest);
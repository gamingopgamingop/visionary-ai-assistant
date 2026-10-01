// supabase/functions/connector/index.ts

import { createClient } from "@supabase/supabase-js";
import { createClerkClient } from "npm:@clerk/backend@latest";

const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const clerk = createClerkClient({
  secretKey: Deno.env.get("CLERK_SECRET_KEY")!,
  publishableKey: Deno.env.get("CLERK_PUBLISHABLE_KEY")!,
});

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(s),
  );

  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function authenticate(req: Request): Promise<string | null> {
  // ---------------------------------------------------------
  // 1. Custom x-api-key authentication
  // ---------------------------------------------------------
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

  // ---------------------------------------------------------
  // 2. Clerk Bearer-token authentication
  // ---------------------------------------------------------
  const authorization = req.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  try {
    const { isAuthenticated, toAuth } =
      await clerk.authenticateRequest(req);

    if (!isAuthenticated) {
      return null;
    }

    const auth = toAuth();

    return auth.userId ?? null;
  } catch (error) {
    console.error("Clerk authentication failed:", error);
    return null;
  }
}

// -----------------------------------------------------------
// Edge Function
// -----------------------------------------------------------

Deno.serve(async (req) => {
  const userId = await authenticate(req);

  if (!userId) {
    return new Response("Unauthorized", {
      status: 401,
    });
  }

  // Your connector logic using userId...

  return Response.json({
    ok: true,
    userId,
  });
});
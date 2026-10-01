// supabase/functions/connector/index.ts
// @ts-ignore: Deno URL import
import { createClient } from "@supabase/supabase-js";
// @ts-ignore

import { verifyToken } from "@clerk/backend";
const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}

async function authenticate(req: Request): Promise<string | null> {
  const apiKey = req.headers.get("x-api-key");
  if (apiKey) {
    const { data } = await sb.from("api_keys").select("clerk_user_id")
      .eq("key_hash", await sha256(apiKey)).eq("revoked", false).maybeSingle();
    return data?.clerk_user_id ?? null;
  }
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  try {
    const p = await verifyToken(token, { secretKey: Deno.env.get("CLERK_SECRET_KEY")! });
    return p.sub;
  } catch { return null; }
}

Deno.serve(async (req) => {
  const userId = await authenticate(req);
  if (!userId) return new Response("Unauthorized", { status: 401 });
  // ...connector logic using userId
  return Response.json({ ok: true, userId });
});
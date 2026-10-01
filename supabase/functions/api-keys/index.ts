// Manage connector API keys: create (raw key shown once), list, revoke.
// Requires a bearer session (API keys cannot mint more API keys).
import { admin, clientIp, corsHeaders, getIdentity, json, rateLimit, RateLimitError, sha256Hex } from "../_shared/identity.ts";

const ALLOWED_SCOPES = ["mcp", "gallery:read", "gallery:write", "ai"];

function randomKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const b64 = btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `aitk_${b64}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const ipRl = await rateLimit(`ip:${clientIp(req)}`, "api-keys", 60, 60);
    if (!ipRl.allowed) return json({ error: "Rate limit exceeded" }, 429);

    const id = await getIdentity(req);
    if (!id) return json({ error: "Unauthorized" }, 401);
    if (id.provider === "api-key") return json({ error: "API keys cannot manage API keys" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "");
    const db = admin();

    if (action === "create") {
      const name = typeof body.name === "string" ? body.name.slice(0, 100) : null;
      const scopes = Array.isArray(body.scopes)
        ? body.scopes.filter((s: unknown) => typeof s === "string" && ALLOWED_SCOPES.includes(s))
        : ["mcp"];
      const { count } = await db.from("api_keys").select("id", { count: "exact", head: true })
        .eq("user_id", id.userId).eq("revoked", false);
      if ((count ?? 0) >= 20) return json({ error: "Maximum of 20 active keys" }, 400);
      const raw = randomKey();
      const { data, error } = await db.from("api_keys")
        .insert({ user_id: id.userId, key_hash: await sha256Hex(raw), name, scopes })
        .select("id, name, scopes, created_at").single();
      if (error) return json({ error: error.message }, 500);
      return json({ key: raw, ...data, note: "Store this key now; it will not be shown again." });
    }

    if (action === "list") {
      const { data, error } = await db.from("api_keys")
        .select("id, name, scopes, created_at, last_used_at, revoked")
        .eq("user_id", id.userId).order("created_at", { ascending: false });
      if (error) return json({ error: error.message }, 500);
      return json({ keys: data });
    }

    if (action === "revoke") {
      const keyId = String(body.id ?? "");
      if (!/^[0-9a-f-]{36}$/i.test(keyId)) return json({ error: "Invalid id" }, 400);
      const { data, error } = await db.from("api_keys").update({ revoked: true })
        .eq("id", keyId).eq("user_id", id.userId).select("id").maybeSingle();
      if (error) return json({ error: error.message }, 500);
      if (!data) return json({ error: "Not found" }, 404);
      return json({ ok: true });
    }

    return json({ error: "Unknown action. Use create, list, or revoke." }, 400);
  } catch (e) {
    if (e instanceof RateLimitError) return json({ error: "Rate limit exceeded", resetAt: e.resetAt }, 429);
    return json({ error: (e as Error).message }, 500);
  }
});

// Shared identity resolution + rate limiting for edge functions.
// Supports multiple auth providers: Clerk, Supabase, ZITADEL, Logto, Better Auth (OIDC).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { createRemoteJWKSet, jwtVerify } from "https://esm.sh/jose@5.9.6";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-auth-provider",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export const admin = () =>
  createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

export type Identity = {
  userId: string;
  email: string | null;
  provider: string;
};

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();
function jwks(url: string) {
  let s = jwksCache.get(url);
  if (!s) {
    s = createRemoteJWKSet(new URL(url));
    jwksCache.set(url, s);
  }
  return s;
}

/** Derive the Clerk frontend API host from the publishable key (base64 suffix). */
function clerkIssuer(): string | null {
  const pk = Deno.env.get("CLERK_PUBLISHABLE_KEY");
  if (!pk) return null;
  const b64 = pk.replace(/^pk_(test|live)_/, "");
  try {
    const host = atob(b64).replace(/\$$/, "");
    return host ? `https://${host}` : null;
  } catch {
    return null;
  }
}

/** Generic OIDC issuers configured through secrets (ZITADEL / Logto / Better Auth). */
function oidcIssuers(): { name: string; issuer: string }[] {
  const out: { name: string; issuer: string }[] = [];
  for (const [name, key] of [
    ["zitadel", "ZITADEL_ISSUER"],
    ["logto", "LOGTO_ISSUER"],
    ["better-auth", "BETTER_AUTH_ISSUER"],
  ] as const) {
    const v = Deno.env.get(key);
    if (v) out.push({ name, issuer: v.replace(/\/$/, "") });
  }
  return out;
}

async function verifyOidc(token: string, issuer: string, provider: string): Promise<Identity | null> {
  try {
    const conf = await fetch(`${issuer}/.well-known/openid-configuration`).then((r) => r.json());
    const { payload } = await jwtVerify(token, jwks(conf.jwks_uri), { issuer: conf.issuer });
    return {
      userId: `${provider}:${payload.sub}`,
      email: (payload.email as string) ?? null,
      provider,
    };
  } catch {
    return null;
  }
}

/** Resolve the caller identity from the Authorization bearer token. Never trusts body fields. */
export async function getIdentity(req: Request): Promise<Identity | null> {
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) return null;

  // 1. Clerk
  const ci = clerkIssuer();
  if (ci) {
    try {
      const { payload } = await jwtVerify(token, jwks(`${ci}/.well-known/jwks.json`));
      if (payload.sub) {
        return {
          userId: String(payload.sub),
          email: (payload.email as string) ?? null,
          provider: "clerk",
        };
      }
    } catch { /* fall through */ }
  }

  // 2. Supabase (Cloud) session
  try {
    const { data } = await admin().auth.getUser(token);
    if (data.user) {
      return { userId: data.user.id, email: data.user.email ?? null, provider: "supabase" };
    }
  } catch { /* fall through */ }

  // 3. Configured OIDC providers
  for (const { name, issuer } of oidcIssuers()) {
    const id = await verifyOidc(token, issuer, name);
    if (id) return id;
  }

  return null;
}

export type Role = "admin" | "moderator" | "user";

export async function getRoles(userId: string): Promise<Role[]> {
  const { data } = await admin().from("user_roles").select("role").eq("user_id", userId);
  const roles = (data ?? []).map((r: { role: Role }) => r.role);
  return roles.length ? roles : ["user"];
}

export const isAdmin = (roles: Role[]) => roles.includes("admin");
export const isModerator = (roles: Role[]) => roles.includes("admin") || roles.includes("moderator");

/** Sliding-window rate limit backed by the rate_limits table. */
export async function rateLimit(
  subject: string,
  bucket: string,
  limit: number,
  windowSeconds = 60,
): Promise<{ allowed: boolean; count: number; resetAt: string | null }> {
  const { data, error } = await admin().rpc("bump_rate_limit", {
    _subject: subject,
    _bucket: bucket,
    _window_seconds: windowSeconds,
    _limit: limit,
  });
  if (error) return { allowed: true, count: 0, resetAt: null };
  const row = Array.isArray(data) ? data[0] : data;
  return {
    allowed: !!row?.allowed,
    count: row?.current_count ?? 0,
    resetAt: row?.reset_at ?? null,
  };
}

export function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extra },
  });
}

export const clientIp = (req: Request) =>
  req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";

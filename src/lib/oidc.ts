// Generic OIDC (Authorization Code + PKCE) client adapter.
// Works with ZITADEL, Logto and Better Auth (OIDC provider plugin).
// Configure via env: VITE_ZITADEL_ISSUER / VITE_ZITADEL_CLIENT_ID, VITE_LOGTO_*, VITE_BETTER_AUTH_*.

export type OidcId = "zitadel" | "logto" | "better-auth";
export interface OidcProvider { id: OidcId; label: string; issuer: string; clientId: string }
export interface OidcSession {
  provider: OidcId;
  idToken: string;
  accessToken: string;
  expiresAt: number;
  sub: string;
  email: string | null;
  name: string | null;
  picture: string | null;
}

const env = import.meta.env as Record<string, string | undefined>;
const DEFS: { id: OidcId; label: string; prefix: string }[] = [
  { id: "zitadel", label: "ZITADEL", prefix: "ZITADEL" },
  { id: "logto", label: "Logto", prefix: "LOGTO" },
  { id: "better-auth", label: "Better Auth", prefix: "BETTER_AUTH" },
];

export function oidcProviders(): OidcProvider[] {
  return DEFS.flatMap((d) => {
    const issuer = env[`VITE_${d.prefix}_ISSUER`];
    const clientId = env[`VITE_${d.prefix}_CLIENT_ID`];
    return issuer && clientId ? [{ id: d.id, label: d.label, issuer: issuer.replace(/\/$/, ""), clientId }] : [];
  });
}

const SESSION_KEY = "ait_oidc_session";
const PENDING_KEY = "ait_oidc_pending";
const redirectUri = () => `${window.location.origin}/callback`;

const b64url = (buf: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const rand = (n = 32) => b64url(crypto.getRandomValues(new Uint8Array(n)));

async function discovery(issuer: string) {
  const r = await fetch(`${issuer}/.well-known/openid-configuration`);
  if (!r.ok) throw new Error("OIDC discovery failed");
  return r.json() as Promise<{ authorization_endpoint: string; token_endpoint: string; end_session_endpoint?: string }>;
}

export async function startOidcLogin(id: OidcId) {
  const p = oidcProviders().find((x) => x.id === id);
  if (!p) throw new Error(`${id} not configured`);
  const conf = await discovery(p.issuer);
  const verifier = rand(48);
  const challenge = b64url(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)));
  const state = rand(16);
  sessionStorage.setItem(PENDING_KEY, JSON.stringify({ id, verifier, state }));
  const u = new URL(conf.authorization_endpoint);
  u.search = new URLSearchParams({
    client_id: p.clientId, response_type: "code", redirect_uri: redirectUri(),
    scope: "openid profile email offline_access", state,
    code_challenge: challenge, code_challenge_method: "S256",
  }).toString();
  window.location.assign(u.toString());
}

function decodeJwt(t: string): Record<string, unknown> {
  const part = t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(decodeURIComponent(escape(atob(part))));
}

/** Call on /callback. Returns true if an OIDC response was handled. */
export async function completeOidcLogin(search: string): Promise<boolean> {
  const params = new URLSearchParams(search);
  const code = params.get("code");
  const pendingRaw = sessionStorage.getItem(PENDING_KEY);
  if (!code || !pendingRaw) return false;
  const pending = JSON.parse(pendingRaw) as { id: OidcId; verifier: string; state: string };
  sessionStorage.removeItem(PENDING_KEY);
  if (params.get("state") !== pending.state) throw new Error("OIDC state mismatch");
  const p = oidcProviders().find((x) => x.id === pending.id);
  if (!p) throw new Error("Provider no longer configured");
  const conf = await discovery(p.issuer);
  const r = await fetch(conf.token_endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code", code, redirect_uri: redirectUri(),
      client_id: p.clientId, code_verifier: pending.verifier,
    }),
  });
  if (!r.ok) throw new Error(`Token exchange failed (${r.status})`);
  const tok = await r.json();
  const claims = decodeJwt(tok.id_token);
  const s: OidcSession = {
    provider: p.id, idToken: tok.id_token, accessToken: tok.access_token,
    expiresAt: Date.now() + (tok.expires_in ?? 3600) * 1000,
    sub: String(claims.sub), email: (claims.email as string) ?? null,
    name: (claims.name as string) ?? null, picture: (claims.picture as string) ?? null,
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  window.dispatchEvent(new Event("oidc-change"));
  return true;
}

export function getOidcSession(): OidcSession | null {
  try {
    const s = JSON.parse(localStorage.getItem(SESSION_KEY) ?? "null") as OidcSession | null;
    if (!s || s.expiresAt < Date.now()) return null;
    return s;
  } catch { return null; }
}

export function oidcSignOut() {
  localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event("oidc-change"));
}

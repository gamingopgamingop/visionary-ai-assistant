import { createClient } from "@supabase/supabase-js";
import type {
  ConnectorType,
  ConnectorCredentials,
  TokenData,
  OAuthState,
  AuthConfig,
  OAuth2Config,
} from "./types.ts";

const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

/**
 * OAuth state lifetime:
 * 10 minutes.
 */
const OAUTH_STATE_TTL = 10 * 60 * 1000;

const TOKEN_ENCRYPTION_KEY =
  Deno.env.get("CONNECTOR_TOKEN_ENCRYPTION_KEY")!;

/**
 * Check whether an OAuth state has expired.
 */
function isOAuthStateExpired(createdAt: number): boolean {
  return Date.now() - createdAt > OAUTH_STATE_TTL;
}

/**
 * Convert a value that may be either:
 * - a number/timestamp
 * - an ISO date string
 * into milliseconds.
 */
function toTimestamp(value: number | string): number {
  if (typeof value === "number") {
    return value;
  }

  const timestamp = new Date(value).getTime();

  if (Number.isNaN(timestamp)) {
    throw new Error(`Invalid timestamp: ${value}`);
  }

  return timestamp;
}

/**
 * Get the encryption key used for connector tokens.
 */
async function getEncryptionKey(): Promise<CryptoKey> {
  const keyData = new TextEncoder().encode(TOKEN_ENCRYPTION_KEY);

  const hash = await crypto.subtle.digest(
    "SHA-256",
    keyData,
  );

  return crypto.subtle.importKey(
    "raw",
    hash,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );
}

/**
 * Encrypt a connector token.
 */
export async function encryptToken(
  token: string,
): Promise<string> {
  const key = await getEncryptionKey();

  const iv = crypto.getRandomValues(
    new Uint8Array(12),
  );

  const encoded = new TextEncoder().encode(token);

  const encrypted = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    encoded,
  );

  const combined = new Uint8Array(
    iv.length + encrypted.byteLength,
  );

  combined.set(iv);
  combined.set(
    new Uint8Array(encrypted),
    iv.length,
  );

  return btoa(
    String.fromCharCode(...combined),
  );
}

/**
 * Decrypt a connector token.
 */
export async function decryptToken(
  encryptedToken: string,
): Promise<string> {
  const key = await getEncryptionKey();

  const combined = Uint8Array.from(
    atob(encryptedToken),
    (c) => c.charCodeAt(0),
  );

  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);

  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    encrypted,
  );

  return new TextDecoder().decode(decrypted);
}

/**
 * Store encrypted connector credentials.
 */
export async function storeCredentials(
  userId: string,
  connectorType: ConnectorType,
  credentials: ConnectorCredentials,
): Promise<void> {
  const encrypted: Record<string, string> = {};

  for (const [key, value] of Object.entries(credentials)) {
    if (typeof value === "string") {
      encrypted[key] = await encryptToken(value);
    }
  }

  const { error } = await sb
    .from("connector_credentials")
    .upsert({
      user_id: userId,
      connector_type: connectorType,
      credentials: encrypted,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    throw new Error(
      `Failed to store credentials: ${error.message}`,
    );
  }
}

/**
 * Get and decrypt connector credentials.
 */
export async function getCredentials(
  userId: string,
  connectorType: ConnectorType,
): Promise<ConnectorCredentials | null> {
  const { data, error } = await sb
    .from("connector_credentials")
    .select("credentials")
    .eq("user_id", userId)
    .eq("connector_type", connectorType)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const decrypted: ConnectorCredentials = {};

  for (
    const [key, value] of Object.entries(
      data.credentials as Record<string, string>,
    )
  ) {
    decrypted[key as keyof ConnectorCredentials] =
      await decryptToken(value);
  }

  return decrypted;
}

/**
 * Delete connector credentials.
 */
export async function deleteCredentials(
  userId: string,
  connectorType: ConnectorType,
): Promise<void> {
  const { error } = await sb
    .from("connector_credentials")
    .delete()
    .eq("user_id", userId)
    .eq("connector_type", connectorType);

  if (error) {
    throw new Error(
      `Failed to delete credentials: ${error.message}`,
    );
  }
}

/**
 * Store OAuth state.
 *
 * The expiry is calculated here if the caller has not
 * already supplied one.
 */
export async function storeOAuthState(
  state: OAuthState,
): Promise<void> {
  const createdAt = toTimestamp(state.createdAt);

  const expiresAt =
    state.expiresAt ||
    createdAt + OAUTH_STATE_TTL;

  const { error } = await sb
    .from("oauth_states")
    .insert({
      state: state.state,
      code_verifier: state.codeVerifier,
      redirect_uri: state.redirectUri,
      connector_type: state.connectorType,
      user_id: state.userId,
      scopes: state.scopes,
      created_at: state.createdAt,
      expires_at: expiresAt,
    });

  if (error) {
    throw new Error(
      `Failed to store OAuth state: ${error.message}`,
    );
  }
}

/**
 * Retrieve and validate OAuth state.
 *
 * OAuth state is valid for a maximum of 10 minutes.
 */
export async function getOAuthState(
  state: string,
): Promise<OAuthState | null> {
  const { data, error } = await sb
    .from("oauth_states")
    .select("*")
    .eq("state", state)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const createdAt = toTimestamp(data.created_at);

  const expiresAt = toTimestamp(data.expires_at);

  const oauthState: OAuthState = {
    state: data.state,
    codeVerifier: data.code_verifier,
    redirectUri: data.redirect_uri,
    connectorType: data.connector_type,
    userId: data.user_id,
    scopes: data.scopes,
    createdAt,
    expiresAt,
  };

  /**
   * Check both the explicit expiration timestamp
   * and the 10-minute TTL.
   */
  const expiredByTtl =
    isOAuthStateExpired(oauthState.createdAt);

  const expiredByTimestamp =
    Date.now() >= oauthState.expiresAt;

  if (expiredByTtl || expiredByTimestamp) {
    await deleteOAuthState(state);
    return null;
  }

  return oauthState;
}

/**
 * Delete OAuth state after use.
 */
export async function deleteOAuthState(
  state: string,
): Promise<void> {
  const { error } = await sb
    .from("oauth_states")
    .delete()
    .eq("state", state);

  if (error) {
    throw new Error(
      `Failed to delete OAuth state: ${error.message}`,
    );
  }
}

/**
 * Exchange an OAuth authorization code for tokens.
 */
export async function exchangeOAuthCode(
  config: OAuth2Config,
  code: string,
  codeVerifier?: string,
): Promise<TokenData> {
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: config.redirectUri,
    client_id: config.clientId,
    client_secret: config.clientSecret,
  });

  if (codeVerifier) {
    params.set(
      "code_verifier",
      codeVerifier,
    );
  }

  const response = await fetch(
    config.tokenUrl,
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: params.toString(),
    },
  );

  if (!response.ok) {
    const error = await response.text();

    throw new Error(
      `Token exchange failed: ${error}`,
    );
  }

  const tokenData = await response.json();

  return {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresAt:
      Date.now() +
      (tokenData.expires_in || 3600) * 1000,
    tokenType:
      tokenData.token_type || "Bearer",
    scope: tokenData.scope,
  };
}

/**
 * Refresh an OAuth access token.
 */
export async function refreshOAuthToken(
  config: OAuth2Config,
  refreshToken: string,
): Promise<TokenData> {
  const response = await fetch(
    config.tokenUrl,
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: config.clientId,
        client_secret: config.clientSecret,
      }).toString(),
    },
  );

  if (!response.ok) {
    const error = await response.text();

    throw new Error(
      `Token refresh failed: ${error}`,
    );
  }

  const tokenData = await response.json();

  return {
    accessToken: tokenData.access_token,
    refreshToken:
      tokenData.refresh_token || refreshToken,
    expiresAt:
      Date.now() +
      (tokenData.expires_in || 3600) * 1000,
    tokenType:
      tokenData.token_type || "Bearer",
    scope: tokenData.scope,
  };
}

/**
 * Generate a cryptographically random OAuth state.
 */
export function generateOAuthState(): string {
  const array = new Uint8Array(32);

  crypto.getRandomValues(array);

  return Array.from(
    array,
    (b) =>
      b.toString(16).padStart(2, "0"),
  ).join("");
}

/**
 * Generate a PKCE verifier.
 */
export function generatePKCEVerifier(): string {
  const array = new Uint8Array(32);

  crypto.getRandomValues(array);

  return Array.from(
    array,
    (b) =>
      b.toString(16).padStart(2, "0"),
  ).join("");
}

/**
 * Generate a PKCE S256 challenge.
 *
 * PKCE S256 requires:
 *
 * BASE64URL(SHA256(verifier))
 */
export async function generatePKCEChallenge(
  verifier: string,
): Promise<string> {
  const data =
    new TextEncoder().encode(verifier);

  const digest =
    await crypto.subtle.digest(
      "SHA-256",
      data,
    );

  const bytes =
    new Uint8Array(digest);

  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Build the OAuth authorization URL.
 */
export function buildAuthorizationUrl(
  config: OAuth2Config,
  state: string,
  codeChallenge?: string,
): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: config.scopes.join(" "),
    state,
  });

  if (config.pkce && codeChallenge) {
    params.set(
      "code_challenge",
      codeChallenge,
    );

    params.set(
      "code_challenge_method",
      "S256",
    );
  }

  return `${config.authorizationUrl}?${params.toString()}`;
}

/**
 * Validate connector authentication configuration.
 */
export async function validateAuthConfig(
  config: AuthConfig,
): Promise<boolean> {
  switch (config.type) {
    case "oauth2":
      return !!(
        config.oauth2?.authorizationUrl &&
        config.oauth2?.tokenUrl &&
        config.oauth2?.clientId &&
        config.oauth2?.clientSecret &&
        config.oauth2?.redirectUri
      );

    case "api_key":
      return !!config.apiKey?.headerName;

    case "bearer_token":
      return true;

    case "basic":
      return !!(
        config.basic?.username &&
        config.basic?.password
      );

    case "none":
      return true;

    default:
      return false;
  }
}
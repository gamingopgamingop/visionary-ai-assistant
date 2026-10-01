import type { ConnectorType, ConnectorCredentials, TokenData } from "../../types.ts";
import { createClient } from "@supabase/supabase-js";
import { logger } from "../../logger.ts";
import { getCredentials, storeCredentials, encryptToken, decryptToken } from "../../auth.ts";
import { TokenExpiredError, TokenRefreshError } from "../../errors.ts";

const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

export interface TokenManagerConfig {
  refreshThresholdMs?: number;
  maxRetries?: number;
  retryDelayMs?: number;
}

export class TokenManager {
  private config: Required<TokenManagerConfig>;
  private refreshPromises: Map<string, Promise<TokenData>> = new Map();

  constructor(config: TokenManagerConfig = {}) {
    this.config = {
      refreshThresholdMs: config.refreshThresholdMs ?? 5 * 60 * 1000,
      maxRetries: config.maxRetries ?? 3,
      retryDelayMs: config.retryDelayMs ?? 1000,
    };
  }

  async getAccessToken(userId: string, connectorType: ConnectorType): Promise<string | null> {
    const credentials = await getCredentials(userId, connectorType);
    if (!credentials?.accessToken) return null;

    if (this.isTokenExpired(credentials)) {
      return this.refreshToken(userId, connectorType, credentials);
    }

    if (this.shouldRefresh(credentials)) {
      this.scheduleRefresh(userId, connectorType, credentials);
    }

    return credentials.accessToken;
  }

  async getFullCredentials(userId: string, connectorType: ConnectorType): Promise<ConnectorCredentials | null> {
    return getCredentials(userId, connectorType);
  }

  async updateToken(
    userId: string,
    connectorType: ConnectorType,
    tokenData: Partial<TokenData>,
  ): Promise<void> {
    const credentials = await getCredentials(userId, connectorType);
    if (!credentials) {
      throw new Error("Credentials not found");
    }

    const updated: ConnectorCredentials = {
      ...credentials,
      ...tokenData,
    };

    await storeCredentials(userId, connectorType, updated);
  }

  async refreshToken(
    userId: string,
    connectorType: ConnectorType,
    credentials?: ConnectorCredentials,
  ): Promise<string | null> {
    const key = `${userId}:${connectorType}`;

    let refreshPromise = this.refreshPromises.get(key);
    if (refreshPromise) {
      try {
        const tokenData = await refreshPromise;
        return tokenData.accessToken;
      } catch {
        this.refreshPromises.delete(key);
        throw new TokenExpiredError("Token refresh failed");
      }
    }

    if (!credentials) {
      credentials = await getCredentials(userId, connectorType);
    }

    if (!credentials?.refreshToken) {
      throw new TokenExpiredError("No refresh token available");
    }

    refreshPromise = this.performRefresh(userId, connectorType, credentials.refreshToken);
    this.refreshPromises.set(key, refreshPromise);

    try {
      const tokenData = await refreshPromise;
      this.refreshPromises.delete(key);
      return tokenData.accessToken;
    } catch (error) {
      this.refreshPromises.delete(key);
      throw error;
    }
  }

  private async performRefresh(
    userId: string,
    connectorType: ConnectorType,
    refreshToken: string,
  ): Promise<TokenData> {
    const { data: configData, error } = await sb
      .from("connector_configs")
      .select("auth")
      .eq("type", connectorType)
      .maybeSingle();

    if (error || !configData?.auth?.oauth2) {
      throw new ConfigurationError("OAuth2 config not found for connector");
    }

    const oauthConfig = configData.auth.oauth2;

    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        const response = await fetch(oauthConfig.tokenUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json",
          },
          body: new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: refreshToken,
            client_id: oauthConfig.clientId,
            client_secret: oauthConfig.clientSecret,
          }).toString(),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Token refresh failed: ${response.status} ${errorText}`);
        }

        const tokenData = await response.json();
        const newTokenData: TokenData = {
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token || refreshToken,
          expiresAt: Date.now() + (tokenData.expires_in || 3600) * 1000,
          tokenType: tokenData.token_type || "Bearer",
          scope: tokenData.scope,
        };

        await storeCredentials(userId, connectorType, {
          accessToken: newTokenData.accessToken,
          refreshToken: newTokenData.refreshToken,
          expiresAt: newTokenData.expiresAt,
          tokenType: newTokenData.tokenType,
          scope: newTokenData.scope,
        });

        logger.info("Token refreshed successfully", { userId, connectorType, attempt });
        return newTokenData;
      } catch (error) {
        lastError = error as Error;
        logger.warn("Token refresh attempt failed", { userId, connectorType, attempt, error: lastError.message });

        if (attempt < this.config.maxRetries) {
          await this.sleep(this.config.retryDelayMs * attempt);
        }
      }
    }

    throw new TokenRefreshError("Max retries exceeded for token refresh", { userId, connectorType }, lastError!);
  }

  private scheduleRefresh(
    userId: string,
    connectorType: ConnectorType,
    credentials: ConnectorCredentials,
  ): void {
    if (!credentials.expiresAt) return;

    const timeUntilExpiry = credentials.expiresAt - Date.now();
    const refreshIn = Math.max(0, timeUntilExpiry - this.config.refreshThresholdMs);

    setTimeout(() => {
      this.refreshToken(userId, connectorType, credentials).catch((error) => {
        logger.error("Scheduled token refresh failed", { userId, connectorType }, error);
      });
    }, refreshIn);
  }

  private isTokenExpired(credentials: ConnectorCredentials): boolean {
    if (!credentials.expiresAt) return false;
    return credentials.expiresAt <= Date.now();
  }

  private shouldRefresh(credentials: ConnectorCredentials): boolean {
    if (!credentials.expiresAt) return false;
    return credentials.expiresAt - Date.now() < this.config.refreshThresholdMs;
  }

  async revokeToken(userId: string, connectorType: ConnectorType): Promise<void> {
    await sb.from("connector_credentials").delete().eq("user_id", userId).eq("connector_type", connectorType);
    const key = `${userId}:${connectorType}`;
    this.refreshPromises.delete(key);
    logger.info("Token revoked", { userId, connectorType });
  }

  async rotateEncryptionKey(newKey: string): Promise<void> {
    const { data, error } = await sb.from("connector_credentials").select("*");
    if (error) throw new Error(`Failed to fetch credentials: ${error.message}`);

    for (const row of data || []) {
      const decrypted: Record<string, string> = {};
      for (const [key, value] of Object.entries(row.credentials as Record<string, string>)) {
        decrypted[key] = await decryptToken(value);
      }

      const encrypted: Record<string, string> = {};
      const oldKey = Deno.env.get("CONNECTOR_TOKEN_ENCRYPTION_KEY");
      Deno.env.set("CONNECTOR_TOKEN_ENCRYPTION_KEY", newKey);

      for (const [key, value] of Object.entries(decrypted)) {
        encrypted[key] = await encryptToken(value);
      }

      Deno.env.set("CONNECTOR_TOKEN_ENCRYPTION_KEY", oldKey!);

      await sb
        .from("connector_credentials")
        .update({ credentials: encrypted })
        .eq("user_id", row.user_id)
        .eq("connector_type", row.connector_type);
    }

    logger.info("Encryption key rotated for all tokens");
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getPendingRefreshCount(): number {
    return this.refreshPromises.size;
  }
}

export const tokenManager = new TokenManager();
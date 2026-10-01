import type { ConnectorType, OAuthState, TokenData, AuthConfig, OAuth2Config } from "../../types.ts";
import { createClient } from "@supabase/supabase-js";
import { AuthenticationError, TokenExpiredError, TokenRefreshError, ConfigurationError } from "../../errors.ts";
import { logger } from "../../logger.ts";
import {
  storeOAuthState,
  getOAuthState,
  deleteOAuthState,
  exchangeOAuthCode,
  refreshOAuthToken,
  generateOAuthState,
  generatePKCEVerifier,
  generatePKCEChallenge,
  buildAuthorizationUrl,
  validateAuthConfig,
  storeCredentials,
  getCredentials,
} from "../../auth.ts";

const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

export interface OAuthManagerConfig {
  stateTtlMs?: number;
  autoRefreshThresholdMs?: number;
}

export class OAuthManager {
  private config: Required<OAuthManagerConfig>;

  constructor(config: OAuthManagerConfig = {}) {
    this.config = {
      stateTtlMs: config.stateTtlMs ?? 10 * 60 * 1000,
      autoRefreshThresholdMs: config.autoRefreshThresholdMs ?? 5 * 60 * 1000,
    };
  }

  async initiateOAuthFlow(
    userId: string,
    connectorType: ConnectorType,
    authConfig: AuthConfig,
    redirectUri: string,
    scopes: string[] = [],
  ): Promise<{ authorizationUrl: string; state: string }> {
    if (authConfig.type !== "oauth2" || !authConfig.oauth2) {
      throw new ConfigurationError("Connector does not support OAuth2", { connectorType });
    }

    const oauthConfig: OAuth2Config = {
      ...authConfig.oauth2,
      redirectUri,
      scopes: scopes.length > 0 ? scopes : authConfig.oauth2.scopes,
    };

    if (!(await validateAuthConfig({ type: "oauth2", oauth2: oauthConfig }))) {
      throw new ConfigurationError("Invalid OAuth2 configuration", { connectorType });
    }

    const state = generateOAuthState();
    const codeVerifier = oauthConfig.pkce ? generatePKCEVerifier() : undefined;
    const codeChallenge = codeVerifier ? generatePKCEChallenge(codeVerifier) : undefined;

    const oauthState: OAuthState = {
      state,
      codeVerifier,
      redirectUri,
      connectorType,
      userId,
      scopes: oauthConfig.scopes,
      createdAt: Date.now(),
      expiresAt: Date.now() + this.config.stateTtlMs,
    };

    await storeOAuthState(oauthState);

    const authorizationUrl = buildAuthorizationUrl(oauthConfig, state, codeChallenge);

    logger.info("Initiated OAuth flow", { userId, connectorType, state });

    return { authorizationUrl, state };
  }

  async handleOAuthCallback(
    state: string,
    code: string,
  ): Promise<{ userId: string; connectorType: ConnectorType; tokenData: TokenData }> {
    const oauthState = await getOAuthState(state);
    if (!oauthState) {
      throw new AuthenticationError("Invalid or expired OAuth state");
    }

    await deleteOAuthState(state);

    const registryConfig = await this.getConnectorAuthConfig(oauthState.connectorType);
    if (!registryConfig || registryConfig.type !== "oauth2" || !registryConfig.oauth2) {
      throw new ConfigurationError("Connector OAuth2 config not found");
    }

    const oauthConfig: OAuth2Config = {
      ...registryConfig.oauth2,
      redirectUri: oauthState.redirectUri,
      scopes: oauthState.scopes,
    };

    const tokenData = await exchangeOAuthCode(oauthConfig, code, oauthState.codeVerifier);

    await storeCredentials(oauthState.userId, oauthState.connectorType, {
      accessToken: tokenData.accessToken,
      refreshToken: tokenData.refreshToken,
      expiresAt: tokenData.expiresAt,
      tokenType: tokenData.tokenType,
      scope: tokenData.scope,
    });

    logger.info("OAuth callback successful", {
      userId: oauthState.userId,
      connectorType: oauthState.connectorType,
    });

    return {
      userId: oauthState.userId,
      connectorType: oauthState.connectorType,
      tokenData,
    };
  }

  async refreshAccessToken(
    userId: string,
    connectorType: ConnectorType,
  ): Promise<TokenData | null> {
    const credentials = await getCredentials(userId, connectorType);
    if (!credentials?.refreshToken) {
      logger.warn("No refresh token available", { userId, connectorType });
      return null;
    }

    const registryConfig = await this.getConnectorAuthConfig(connectorType);
    if (!registryConfig || registryConfig.type !== "oauth2" || !registryConfig.oauth2) {
      throw new ConfigurationError("Connector OAuth2 config not found");
    }

    try {
      const tokenData = await refreshOAuthToken(registryConfig.oauth2, credentials.refreshToken);

      await storeCredentials(userId, connectorType, {
        ...credentials,
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken,
        expiresAt: tokenData.expiresAt,
        tokenType: tokenData.tokenType,
        scope: tokenData.scope,
      });

      logger.info("Access token refreshed", { userId, connectorType });
      return tokenData;
    } catch (error) {
      logger.error("Failed to refresh access token", { userId, connectorType }, error as Error);
      throw new TokenRefreshError("Failed to refresh access token", { userId, connectorType }, error as Error);
    }
  }

  async getValidAccessToken(
    userId: string,
    connectorType: ConnectorType,
  ): Promise<string | null> {
    const credentials = await getCredentials(userId, connectorType);
    if (!credentials?.accessToken) {
      return null;
    }

    if (credentials.expiresAt && credentials.expiresAt - Date.now() < this.config.autoRefreshThresholdMs) {
      logger.info("Access token near expiry, refreshing", { userId, connectorType });
      const tokenData = await this.refreshAccessToken(userId, connectorType);
      return tokenData?.accessToken ?? null;
    }

    return credentials.accessToken;
  }

  async revokeAccess(userId: string, connectorType: ConnectorType): Promise<void> {
    await sb.from("connector_credentials").delete().eq("user_id", userId).eq("connector_type", connectorType);
    logger.info("Revoked access", { userId, connectorType });
  }

  async isTokenValid(userId: string, connectorType: ConnectorType): Promise<boolean> {
    const credentials = await getCredentials(userId, connectorType);
    if (!credentials?.accessToken) return false;

    if (credentials.expiresAt && credentials.expiresAt <= Date.now()) {
      try {
        await this.refreshAccessToken(userId, connectorType);
        return true;
      } catch {
        return false;
      }
    }

    return true;
  }

  private async getConnectorAuthConfig(connectorType: ConnectorType): Promise<AuthConfig | null> {
    const { data, error } = await sb
      .from("connector_configs")
      .select("auth")
      .eq("type", connectorType)
      .maybeSingle();

    if (error || !data) return null;
    return data.auth as AuthConfig;
  }

  generatePKCEPair(): { verifier: string; challenge: string } {
    const verifier = generatePKCEVerifier();
    const challenge = generatePKCEChallenge(verifier);
    return { verifier, challenge };
  }
}

export const oauthManager = new OAuthManager();
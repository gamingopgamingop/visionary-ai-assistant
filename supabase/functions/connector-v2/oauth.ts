import { createClient } from '@supabase/supabase-js';
import type { ConnectorConfig, OAuthState, TokenData, ConnectorAuthType, OAuth2Config } from './types.ts';
import { ConfigurationError, AuthenticationError, TokenRefreshError } from './errors.ts';

const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const OAUTH_STATE_TTL = 10 * 60 * 1000;

export interface OAuthManagerConfig {
    stateTtlMs?: number;
    autoRefreshThresholdMs?: number;
}

export class OAuthManager {
    private config: Required<OAuthManagerConfig>;

    constructor(config: OAuthManagerConfig = {}) {
        this.config = {
            stateTtlMs: config.stateTtlMs ?? OAUTH_STATE_TTL,
            autoRefreshThresholdMs: config.autoRefreshThresholdMs ?? 5 * 60 * 1000,
        };
    }

    async initiateOAuthFlow(
        userId: string,
        connectorId: string,
        authConfig: { type: ConnectorAuthType; oauth2?: OAuth2Config },
        redirectUri: string,
        scopes: string[] = []
    ): Promise<{ authorizationUrl: string; state: string }> {
        if (authConfig.type !== 'oauth2' || !authConfig.oauth2) {
            throw new ConfigurationError('Connector does not support OAuth2', { connectorId });
        }

        const oauthConfig: OAuth2Config = {
            ...authConfig.oauth2,
            redirectUri,
            scopes: scopes.length > 0 ? scopes : authConfig.oauth2.scopes,
        };

        if (!oauthConfig.authorizationUrl || !oauthConfig.tokenUrl || !oauthConfig.clientId || !oauthConfig.clientSecret || !oauthConfig.redirectUri) {
            throw new ConfigurationError('Invalid OAuth2 configuration', { connectorId });
        }

        const state = this.generateState();
        const codeVerifier = oauthConfig.pkce ? this.generatePKCEVerifier() : undefined;
        const codeChallenge = codeVerifier ? this.generatePKCEChallenge(codeVerifier) : undefined;

        const oauthState: OAuthState = {
            state,
            codeVerifier,
            redirectUri,
            connectorId,
            userId,
            scopes: oauthConfig.scopes,
            createdAt: Date.now(),
            expiresAt: Date.now() + this.config.stateTtlMs,
        };

        await this.storeOAuthState(oauthState);

        const authorizationUrl = this.buildAuthorizationUrl(oauthConfig, state, codeChallenge);

        return { authorizationUrl, state };
    }

    async handleOAuthCallback(
        state: string,
        code: string
    ): Promise<{ userId: string; connectorId: string; tokenData: TokenData }> {
        const oauthState = await this.getOAuthState(state);
        if (!oauthState) {
            throw new AuthenticationError('Invalid or expired OAuth state');
        }

        await this.deleteOAuthState(state);

        const connectorConfig = connectorRegistry.getConfig(oauthState.connectorId);
        if (connectorConfig.authType !== 'oauth2' || !connectorConfig.oauth2) {
            throw new ConfigurationError('Connector OAuth2 config not found');
        }

        const oauthConfig: OAuth2Config = {
            ...connectorConfig.oauth2,
            redirectUri: oauthState.redirectUri,
            scopes: oauthState.scopes,
        };

        const tokenData = await this.exchangeOAuthCode(oauthConfig, code, oauthState.codeVerifier);

        await this.storeCredentials(oauthState.userId, oauthState.connectorId, {
            accessToken: tokenData.accessToken,
            refreshToken: tokenData.refreshToken,
            expiresAt: tokenData.expiresAt,
            tokenType: tokenData.tokenType,
            scope: tokenData.scope,
        });

        return {
            userId: oauthState.userId,
            connectorId: oauthState.connectorId,
            tokenData,
        };
    }

    async refreshAccessToken(
        userId: string,
        connectorId: string,
        credentials: { refreshToken?: string; accessToken?: string; expiresAt?: number }
    ): Promise<TokenData | null> {
        if (!credentials.refreshToken) {
            return null;
        }

        const connectorConfig = connectorRegistry.getConfig(connectorId);
        if (connectorConfig.authType !== 'oauth2' || !connectorConfig.oauth2) {
            throw new ConfigurationError('Connector OAuth2 config not found');
        }

        try {
            const tokenData = await this.refreshOAuthToken(connectorConfig.oauth2, credentials.refreshToken);

            await this.storeCredentials(userId, connectorId, {
                accessToken: tokenData.accessToken,
                refreshToken: tokenData.refreshToken,
                expiresAt: tokenData.expiresAt,
                tokenType: tokenData.tokenType,
                scope: tokenData.scope,
            });

            return tokenData;
        } catch (error) {
            throw new TokenRefreshError('Failed to refresh access token', { userId, connectorId }, error as Error);
        }
    }

    async getValidAccessToken(
        userId: string,
        connectorId: string,
        credentials: { accessToken?: string; refreshToken?: string; expiresAt?: number }
    ): Promise<string | null> {
        if (!credentials.accessToken) {
            return null;
        }

        if (credentials.expiresAt && credentials.expiresAt - Date.now() < this.config.autoRefreshThresholdMs) {
            const tokenData = await this.refreshAccessToken(userId, connectorId, credentials);
            return tokenData?.accessToken ?? null;
        }

        return credentials.accessToken;
    }

    async revokeAccess(userId: string, connectorId: string): Promise<void> {
        await supabase.from('connector_connections')
            .update({ status: 'revoked', updated_at: new Date().toISOString() })
            .eq('user_id', userId)
            .eq('connector_id', connectorId);
    }

    async isTokenValid(userId: string, connectorId: string, credentials: { accessToken?: string; refreshToken?: string; expiresAt?: number }): Promise<boolean> {
        if (!credentials.accessToken) return false;

        if (credentials.expiresAt && credentials.expiresAt <= Date.now()) {
            try {
                await this.refreshAccessToken(userId, connectorId, credentials);
                return true;
            } catch {
                return false;
            }
        }

        return true;
    }

    private async storeOAuthState(state: OAuthState): Promise<void> {
        const { error } = await supabase.from('oauth_states').insert({
            state: state.state,
            code_verifier: state.codeVerifier,
            redirect_uri: state.redirectUri,
            connector_id: state.connectorId,
            user_id: state.userId,
            scopes: state.scopes,
            created_at: state.createdAt,
            expires_at: state.expiresAt,
        });

        if (error) throw new Error(`Failed to store OAuth state: ${error.message}`);
    }

    private async getOAuthState(state: string): Promise<OAuthState | null> {
        const { data, error } = await supabase
            .from('oauth_states')
            .select('*')
            .eq('state', state)
            .gt('expires_at', Date.now())
            .maybeSingle();

        if (error || !data) return null;

        return {
            state: data.state,
            codeVerifier: data.code_verifier,
            redirectUri: data.redirect_uri,
            connectorId: data.connector_id,
            userId: data.user_id,
            scopes: data.scopes,
            createdAt: data.created_at,
            expiresAt: data.expires_at,
        };
    }

    private async deleteOAuthState(state: string): Promise<void> {
        await supabase.from('oauth_states').delete().eq('state', state);
    }

    private async exchangeOAuthCode(
        config: OAuth2Config,
        code: string,
        codeVerifier?: string
    ): Promise<TokenData> {
        const params = new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: config.redirectUri,
            client_id: config.clientId,
            client_secret: config.clientSecret,
        });

        if (codeVerifier) {
            params.set('code_verifier', codeVerifier);
        }

        const response = await fetch(config.tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Accept: 'application/json',
            },
            body: params.toString(),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Token exchange failed: ${error}`);
        }

        const tokenData = await response.json();
        return {
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token,
            expiresAt: Date.now() + (tokenData.expires_in || 3600) * 1000,
            tokenType: tokenData.token_type || 'Bearer',
            scope: tokenData.scope,
        };
    }

    private async refreshOAuthToken(
        config: OAuth2Config,
        refreshToken: string
    ): Promise<TokenData> {
        const response = await fetch(config.tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Accept: 'application/json',
            },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
                client_id: config.clientId,
                client_secret: config.clientSecret,
            }).toString(),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Token refresh failed: ${error}`);
        }

        const tokenData = await response.json();
        return {
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token || refreshToken,
            expiresAt: Date.now() + (tokenData.expires_in || 3600) * 1000,
            tokenType: tokenData.token_type || 'Bearer',
            scope: tokenData.scope,
        };
    }

    private async storeCredentials(
        userId: string,
        connectorId: string,
        credentials: { accessToken: string; refreshToken?: string; expiresAt: number; tokenType: string; scope?: string }
    ): Promise<void> {
        const connection = await this.getUserConnection(userId, connectorId);
        if (!connection) {
            throw new Error('Connection not found');
        }

        await supabase
            .from('connector_connections')
            .update({ credentials, updated_at: new Date().toISOString() })
            .eq('id', connection.id);
    }

    private async getUserConnection(userId: string, connectorId: string) {
        const { data, error } = await supabase
            .from('connector_connections')
            .select('id')
            .eq('user_id', userId)
            .eq('connector_id', connectorId)
            .maybeSingle();

        if (error || !data) return null;
        return data;
    }

    private buildAuthorizationUrl(config: OAuth2Config, state: string, codeChallenge?: string): string {
        const params = new URLSearchParams({
            response_type: 'code',
            client_id: config.clientId,
            redirect_uri: config.redirectUri,
            scope: config.scopes.join(' '),
            state,
        });

        if (config.pkce && codeChallenge) {
            params.set('code_challenge', codeChallenge);
            params.set('code_challenge_method', 'S256');
        }

        return `${config.authorizationUrl}?${params.toString()}`;
    }

    generateState(): string {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
    }

    generatePKCEVerifier(): string {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
    }

    generatePKCEChallenge(verifier: string): string {
        const encoder = new TextEncoder();
        const data = encoder.encode(verifier);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hashBuffer), b => b.toString(16).padStart(2, '0')).join('');
    }
}

// Need to import connectorRegistry
import { connectorRegistry } from './registry.ts';

export const oauthManager = new OAuthManager();
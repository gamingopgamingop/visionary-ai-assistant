import { createClient } from '@supabase/supabase-js';
import type { ConnectorType, ConnectorCredentials, TokenData } from './types.ts';
import { TokenExpiredError, TokenRefreshError, ConfigurationError } from './errors.ts';

const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
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

    async getAccessToken(userId: string, connectorId: string): Promise<string | null> {
        const credentials = await this.getCredentials(userId, connectorId);
        if (!credentials?.accessToken) return null;

        if (this.isTokenExpired(credentials)) {
            return this.refreshToken(userId, connectorId, credentials);
        }

        if (this.shouldRefresh(credentials)) {
            this.scheduleRefresh(userId, connectorId, credentials);
        }

        return credentials.accessToken;
    }

    async getFullCredentials(userId: string, connectorId: string): Promise<ConnectorCredentials | null> {
        return this.getCredentials(userId, connectorId);
    }

    async updateToken(
        userId: string,
        connectorId: string,
        tokenData: Partial<TokenData>
    ): Promise<void> {
        const credentials = await this.getCredentials(userId, connectorId);
        if (!credentials) {
            throw new Error('Credentials not found');
        }

        const updated: ConnectorCredentials = {
            ...credentials,
            ...tokenData,
        };

        await this.storeCredentials(userId, connectorId, updated);
    }

    async refreshToken(
        userId: string,
        connectorId: string,
        credentials?: ConnectorCredentials
    ): Promise<string | null> {
        const key = `${userId}:${connectorId}`;

        let refreshPromise = this.refreshPromises.get(key);
        if (refreshPromise) {
            try {
                const tokenData = await refreshPromise;
                return tokenData.accessToken;
            } catch {
                this.refreshPromises.delete(key);
                throw new TokenExpiredError('Token refresh failed');
            }
        }

        if (!credentials) {
            credentials = await this.getCredentials(userId, connectorId);
        }

        if (!credentials?.refreshToken) {
            throw new TokenExpiredError('No refresh token available');
        }

        refreshPromise = this.performRefresh(userId, connectorId, credentials.refreshToken);
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
        connectorId: string,
        refreshToken: string
    ): Promise<TokenData> {
        const { data: configData, error } = await supabase
            .from('connector_connections')
            .select('config')
            .eq('user_id', userId)
            .eq('connector_id', connectorId)
            .maybeSingle();

        if (error || !configData?.config?.oauth2) {
            throw new ConfigurationError('OAuth2 config not found for connector');
        }

        const oauthConfig = configData.config.oauth2;

        let lastError: Error | null = null;
        for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
            try {
                const response = await fetch(oauthConfig.tokenUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        Accept: 'application/json',
                    },
                    body: new URLSearchParams({
                        grant_type: 'refresh_token',
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
                    tokenType: tokenData.token_type || 'Bearer',
                    scope: tokenData.scope,
                };

                await this.storeCredentials(userId, connectorId, {
                    accessToken: newTokenData.accessToken,
                    refreshToken: newTokenData.refreshToken,
                    expiresAt: newTokenData.expiresAt,
                    tokenType: newTokenData.tokenType,
                    scope: newTokenData.scope,
                });

                return newTokenData;
            } catch (error) {
                lastError = error as Error;

                if (attempt < this.config.maxRetries) {
                    await this.sleep(this.config.retryDelayMs * attempt);
                }
            }
        }

        throw new TokenRefreshError('Max retries exceeded for token refresh', { userId, connectorId }, lastError!);
    }

    private scheduleRefresh(
        userId: string,
        connectorId: string,
        credentials: ConnectorCredentials
    ): void {
        if (!credentials.expiresAt) return;

        const timeUntilExpiry = credentials.expiresAt - Date.now();
        const refreshIn = Math.max(0, timeUntilExpiry - this.config.refreshThresholdMs);

        setTimeout(() => {
            this.refreshToken(userId, connectorId, credentials).catch((error) => {
                console.error('Scheduled token refresh failed', { userId, connectorId }, error);
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

    async revokeToken(userId: string, connectorId: string): Promise<void> {
        await supabase
            .from('connector_connections')
            .update({ status: 'revoked', updated_at: new Date().toISOString() })
            .eq('user_id', userId)
            .eq('connector_id', connectorId);

        const key = `${userId}:${connectorId}`;
        this.refreshPromises.delete(key);
    }

    private async getCredentials(userId: string, connectorId: string): Promise<ConnectorCredentials | null> {
        const { data, error } = await supabase
            .from('connector_connections')
            .select('credentials')
            .eq('user_id', userId)
            .eq('connector_id', connectorId)
            .maybeSingle();

        if (error || !data) return null;
        return data.credentials as ConnectorCredentials;
    }

    private async storeCredentials(userId: string, connectorId: string, credentials: ConnectorCredentials): Promise<void> {
        await supabase
            .from('connector_connections')
            .update({ credentials, updated_at: new Date().toISOString() })
            .eq('user_id', userId)
            .eq('connector_id', connectorId);
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getPendingRefreshCount(): number {
        return this.refreshPromises.size;
    }
}

export const tokenManager = new TokenManager();
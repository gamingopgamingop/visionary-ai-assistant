import { createClient } from '@supabase/supabase-js';
import { connectorRegistry } from './registry.ts';
import type { ConnectorConfig, ConnectorConnection, ConnectorCredentials, ConnectorStatus, ConnectorActionResult, ConnectionTestResult } from './types.ts';
import { ConnectorNotFoundError, AuthenticationError, ConfigurationError } from './errors.ts';

const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

export interface ConnectorManagerConfig {
    maxConnectionsPerUser?: number;
    defaultTimeoutMs?: number;
}

export class ConnectorManager {
    private config: Required<ConnectorManagerConfig>;
    private activeConnections: Map<string, { instance: any; expiresAt: number }> = new Map();

    constructor(config: ConnectorManagerConfig = {}) {
        this.config = {
            maxConnectionsPerUser: config.maxConnectionsPerUser ?? 10,
            defaultTimeoutMs: config.defaultTimeoutMs ?? 30000,
        };
    }

    async createConnection(
        userId: string,
        connectorId: string,
        name: string,
        credentials: ConnectorCredentials,
        config?: Record<string, unknown>,
        metadata?: Record<string, unknown>
    ): Promise<ConnectorConnection> {
        const registryConfig = connectorRegistry.getConfig(connectorId);

        const existingCount = await this.getUserConnectionCount(userId);
        if (existingCount >= this.config.maxConnectionsPerUser) {
            throw new ConfigurationError(
                `Maximum connector connections (${this.config.maxConnectionsPerUser}) reached for user`,
                { userId, connectorId }
            );
        }

        const connection: ConnectorConnection = {
            id: crypto.randomUUID(),
            userId,
            connectorId,
            name,
            status: 'pending',
            authType: registryConfig.authType,
            config: config || {},
            credentials,
            permissions: registryConfig.requiredPermissions,
            errorCount: 0,
            metadata: metadata || {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        const { error } = await supabase.from('connector_connections').insert({
            id: connection.id,
            user_id: connection.userId,
            connector_id: connection.connectorId,
            name: connection.name,
            status: connection.status,
            auth_type: connection.authType,
            config: connection.config,
            credentials: connection.credentials,
            permissions: connection.permissions,
            error_count: connection.errorCount,
            metadata: connection.metadata,
            created_at: connection.createdAt,
            updated_at: connection.updatedAt,
        });

        if (error) {
            throw new Error(`Failed to create connector connection: ${error.message}`);
        }

        return connection;
    }

    async getConnection(connectionId: string): Promise<ConnectorConnection | null> {
        const { data, error } = await supabase
            .from('connector_connections')
            .select('*')
            .eq('id', connectionId)
            .maybeSingle();

        if (error || !data) return null;

        return this.mapRowToConnection(data);
    }

    async getUserConnections(userId: string): Promise<ConnectorConnection[]> {
        const { data, error } = await supabase
            .from('connector_connections')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw new Error(`Failed to get user connections: ${error.message}`);

        return (data || []).map(this.mapRowToConnection);
    }

    async getUserConnectionsByConnector(userId: string, connectorId: string): Promise<ConnectorConnection[]> {
        const { data, error } = await supabase
            .from('connector_connections')
            .select('*')
            .eq('user_id', userId)
            .eq('connector_id', connectorId)
            .order('created_at', { ascending: false });

        if (error) throw new Error(`Failed to get user connections: ${error.message}`);

        return (data || []).map(this.mapRowToConnection);
    }

    async updateConnection(
        connectionId: string,
        updates: Partial<Pick<ConnectorConnection, 'name' | 'status' | 'config' | 'permissions' | 'metadata'>>
    ): Promise<ConnectorConnection | null> {
        const connection = await this.getConnection(connectionId);
        if (!connection) return null;

        const updateData: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
        };

        if (updates.name) updateData.name = updates.name;
        if (updates.status) updateData.status = updates.status;
        if (updates.config) updateData.config = updates.config;
        if (updates.permissions) updateData.permissions = updates.permissions;
        if (updates.metadata) updateData.metadata = updates.metadata;

        const { error } = await supabase
            .from('connector_connections')
            .update(updateData)
            .eq('id', connectionId);

        if (error) throw new Error(`Failed to update connection: ${error.message}`);

        return { ...connection, ...updates, updatedAt: updateData.updated_at as string };
    }

    async updateConnectionCredentials(connectionId: string, credentials: ConnectorCredentials): Promise<void> {
        const { error } = await supabase
            .from('connector_connections')
            .update({ credentials, updated_at: new Date().toISOString() })
            .eq('id', connectionId);

        if (error) throw new Error(`Failed to update credentials: ${error.message}`);

        this.activeConnections.delete(connectionId);
    }

    async deleteConnection(connectionId: string): Promise<boolean> {
        const connection = await this.getConnection(connectionId);
        if (!connection) return false;

        await this.releaseConnection(connectionId);

        const { error } = await supabase
            .from('connector_connections')
            .delete()
            .eq('id', connectionId);

        if (error) throw new Error(`Failed to delete connection: ${error.message}`);

        return true;
    }

    async getConnectorInstance(connectionId: string): Promise<any> {
        const cached = this.activeConnections.get(connectionId);
        if (cached && cached.expiresAt > Date.now()) {
            return cached.instance;
        }

        const connection = await this.getConnection(connectionId);
        if (!connection) {
            throw new ConnectorNotFoundError(connectionId);
        }

        if (connection.status !== 'active') {
            throw new AuthenticationError(`Connector connection is ${connection.status}`);
        }

        const instance = connectorRegistry.createInstance(connection.connectorId, connection.credentials);
        await instance.initialize();

        this.activeConnections.set(connectionId, {
            instance,
            expiresAt: Date.now() + this.config.defaultTimeoutMs,
        });

        return instance;
    }

    async testConnection(connectionId: string): Promise<ConnectionTestResult> {
        const instance = await this.getConnectorInstance(connectionId);
        const result = await instance.testConnection();

        if (result.success) {
            await this.updateLastUsed(connectionId);
        } else {
            await this.incrementErrorCount(connectionId, result.message);
        }

        return result;
    }

    async executeAction(
        connectionId: string,
        action: string,
        params: Record<string, unknown>
    ): Promise<ConnectorActionResult> {
        const connection = await this.getConnection(connectionId);
        if (!connection) {
            throw new ConnectorNotFoundError(connectionId);
        }

        if (connection.status !== 'active') {
            throw new AuthenticationError(`Connector connection is ${connection.status}`);
        }

        const registryConfig = connectorRegistry.getConfig(connection.connectorId);
        const endpointConfig = registryConfig.endpoints[action];

        if (!endpointConfig) {
            throw new Error(`Action '${action}' not found in connector '${connection.connectorId}'`);
        }

        if (endpointConfig.requiredPermissions && endpointConfig.requiredPermissions.length > 0) {
            const hasPermission = endpointConfig.requiredPermissions.every(p => connection.permissions.includes(p));
            if (!hasPermission) {
                throw new Error(`Missing required permissions for action: ${endpointConfig.requiredPermissions.join(', ')}`);
            }
        }

        const instance = await this.getConnectorInstance(connectionId);
        const result = await instance.execute(action, params);

        if (result.success) {
            await this.updateLastUsed(connectionId);
            await this.resetErrorCount(connectionId);
        } else {
            await this.incrementErrorCount(connectionId, result.error?.message);
        }

        return result;
    }

    async updateLastUsed(connectionId: string): Promise<void> {
        await supabase
            .from('connector_connections')
            .update({ last_used_at: new Date().toISOString() })
            .eq('id', connectionId);
    }

    async incrementErrorCount(connectionId: string, errorMessage?: string): Promise<void> {
        const { data } = await supabase
            .from('connector_connections')
            .select('error_count')
            .eq('id', connectionId)
            .single();

        const newCount = (data?.error_count || 0) + 1;
        const status = newCount >= 5 ? 'error' : undefined;

        const updates: Record<string, unknown> = {
            error_count: newCount,
            last_error: errorMessage,
            updated_at: new Date().toISOString(),
        };

        if (status) {
            updates.status = status;
        }

        await supabase
            .from('connector_connections')
            .update(updates)
            .eq('id', connectionId);
    }

    async resetErrorCount(connectionId: string): Promise<void> {
        await supabase
            .from('connector_connections')
            .update({ error_count: 0, last_error: null, updated_at: new Date().toISOString() })
            .eq('id', connectionId);
    }

    async addPermission(connectionId: string, permission: string): Promise<void> {
        const connection = await this.getConnection(connectionId);
        if (!connection) throw new ConnectorNotFoundError(connectionId);

        if (!connection.permissions.includes(permission)) {
            const permissions = [...connection.permissions, permission];
            await this.updateConnection(connectionId, { permissions });
        }
    }

    async removePermission(connectionId: string, permission: string): Promise<void> {
        const connection = await this.getConnection(connectionId);
        if (!connection) throw new ConnectorNotFoundError(connectionId);

        if (connection.permissions.includes(permission)) {
            const permissions = connection.permissions.filter(p => p !== permission);
            await this.updateConnection(connectionId, { permissions });
        }
    }

    async getConnectionPermissions(connectionId: string): Promise<string[]> {
        const connection = await this.getConnection(connectionId);
        return connection?.permissions || [];
    }

    private async getUserConnectionCount(userId: string): Promise<number> {
        const { count, error } = await supabase
            .from('connector_connections')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);

        if (error) throw new Error(`Failed to count user connections: ${error.message}`);
        return count ?? 0;
    }

    async releaseConnection(connectionId: string): Promise<void> {
        const cached = this.activeConnections.get(connectionId);
        if (cached) {
            try {
                await cached.instance.destroy();
            } catch (error) {
                console.error('Error destroying connector instance:', error);
            }
            this.activeConnections.delete(connectionId);
        }
    }

    async releaseAllUserConnections(userId: string): Promise<void> {
        const connections = await this.getUserConnections(userId);
        for (const connection of connections) {
            await this.releaseConnection(connection.id);
        }
    }

    getActiveConnectionCount(): number {
        return this.activeConnections.size;
    }

    private mapRowToConnection(row: any): ConnectorConnection {
        return {
            id: row.id,
            userId: row.user_id,
            connectorId: row.connector_id,
            name: row.name,
            status: row.status,
            authType: row.auth_type,
            config: row.config || {},
            credentials: row.credentials || {},
            permissions: row.permissions || [],
            lastUsedAt: row.last_used_at,
            lastError: row.last_error,
            errorCount: row.error_count || 0,
            expiresAt: row.expires_at,
            metadata: row.metadata || {},
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }
}

export const connectorManager = new ConnectorManager();
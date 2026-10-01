import { createClient } from '@supabase/supabase-js';
import type { ConnectorType, ConnectorConnection } from './types.ts';
import { PermissionDeniedError, ConfigurationError } from './errors.ts';

const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

export interface PermissionManagerConfig {
    enablePermissionCache?: boolean;
    cacheTtlMs?: number;
}

export class PermissionManager {
    private config: Required<PermissionManagerConfig>;
    private permissionCache: Map<string, { permissions: string[]; expiresAt: number }> = new Map();

    constructor(config: PermissionManagerConfig = {}) {
        this.config = {
            enablePermissionCache: config.enablePermissionCache ?? true,
            cacheTtlMs: config.cacheTtlMs ?? 5 * 60 * 1000,
        };
    }

    async checkConnectionPermission(
        userId: string,
        connectionId: string,
        permission: string
    ): Promise<boolean> {
        const permissions = await this.getConnectionPermissions(connectionId);
        return permissions.includes(permission) || permissions.includes('*');
    }

    async requireConnectionPermission(
        userId: string,
        connectionId: string,
        permission: string
    ): Promise<void> {
        const hasPermission = await this.checkConnectionPermission(userId, connectionId, permission);
        if (!hasPermission) {
            throw new PermissionDeniedError(permission, { userId, connectionId });
        }
    }

    async requireConnectionPermissions(
        userId: string,
        connectionId: string,
        permissions: string[]
    ): Promise<void> {
        for (const permission of permissions) {
            await this.requireConnectionPermission(userId, connectionId, permission);
        }
    }

    async getConnectionPermissions(connectionId: string): Promise<string[]> {
        const cacheKey = `connection:${connectionId}`;
        const cached = this.permissionCache.get(cacheKey);

        if (cached && cached.expiresAt > Date.now()) {
            return cached.permissions;
        }

        const { data: connection } = await supabase
            .from('connector_connections')
            .select('permissions, metadata')
            .eq('id', connectionId)
            .maybeSingle();

        if (!connection) {
            return [];
        }

        let permissions = connection.permissions || [];
        const metadata = connection.metadata as { grantedPermissions?: string[] } | undefined;

        if (metadata?.grantedPermissions) {
            permissions = [...new Set([...permissions, ...metadata.grantedPermissions])];
        }

        if (this.config.enablePermissionCache) {
            this.permissionCache.set(cacheKey, {
                permissions,
                expiresAt: Date.now() + this.config.cacheTtlMs,
            });
        }

        return permissions;
    }

    async grantConnectionPermission(
        userId: string,
        connectionId: string,
        permission: string
    ): Promise<void> {
        const { data: connection } = await supabase
            .from('connector_connections')
            .select('id, user_id, metadata')
            .eq('id', connectionId)
            .eq('user_id', userId)
            .maybeSingle();

        if (!connection) {
            throw new ConfigurationError('Connector connection not found');
        }

        const metadata = (connection.metadata as { grantedPermissions?: string[] }) || { grantedPermissions: [] };
        if (!metadata.grantedPermissions.includes(permission)) {
            metadata.grantedPermissions = [...metadata.grantedPermissions, permission];
            await supabase
                .from('connector_connections')
                .update({ metadata })
                .eq('id', connectionId);

            this.invalidateCache(connectionId);
        }
    }

    async revokeConnectionPermission(
        userId: string,
        connectionId: string,
        permission: string
    ): Promise<void> {
        const { data: connection } = await supabase
            .from('connector_connections')
            .select('id, metadata')
            .eq('id', connectionId)
            .eq('user_id', userId)
            .maybeSingle();

        if (!connection) return;

        const metadata = (connection.metadata as { grantedPermissions?: string[] }) || { grantedPermissions: [] };
        metadata.grantedPermissions = metadata.grantedPermissions.filter(p => p !== permission);

        await supabase
            .from('connector_connections')
            .update({ metadata })
            .eq('id', connectionId);

        this.invalidateCache(connectionId);
    }

    async getConnectorRequiredPermissions(connectorId: string): Promise<string[]> {
        const { data } = await supabase
            .from('connector_configs')
            .select('required_permissions')
            .eq('id', connectorId)
            .maybeSingle();

        return (data?.required_permissions as string[]) || [];
    }

    async getConnectorOptionalPermissions(connectorId: string): Promise<string[]> {
        const { data } = await supabase
            .from('connector_configs')
            .select('optional_permissions')
            .eq('id', connectorId)
            .maybeSingle();

        return (data?.optional_permissions as string[]) || [];
    }

    async validateConnectionPermissions(
        userId: string,
        connectionId: string,
        requestedPermissions: string[]
    ): Promise<{ granted: string[]; missing: string[] }> {
        const connectionPermissions = await this.getConnectionPermissions(connectionId);
        const granted: string[] = [];
        const missing: string[] = [];

        for (const permission of requestedPermissions) {
            if (connectionPermissions.includes(permission) || connectionPermissions.includes('*')) {
                granted.push(permission);
            } else {
                missing.push(permission);
            }
        }

        return { granted, missing };
    }

    async getUserEffectiveConnectorPermissions(userId: string, connectorId: string): Promise<string[]> {
        const { data: connections } = await supabase
            .from('connector_connections')
            .select('permissions, metadata')
            .eq('user_id', userId)
            .eq('connector_id', connectorId)
            .eq('status', 'active');

        if (!connections || connections.length === 0) return [];

        let permissions: string[] = [];
        for (const conn of connections) {
            permissions = [...permissions, ...(conn.permissions || [])];
            const metadata = conn.metadata as { grantedPermissions?: string[] } | undefined;
            if (metadata?.grantedPermissions) {
                permissions = [...permissions, ...metadata.grantedPermissions];
            }
        }

        return [...new Set(permissions)];
    }

    invalidateCache(connectionId: string): void {
        const cacheKey = `connection:${connectionId}`;
        this.permissionCache.delete(cacheKey);
    }

    clearCache(): void {
        this.permissionCache.clear();
    }

    getCacheStats(): { size: number; keys: string[] } {
        return {
            size: this.permissionCache.size,
            keys: Array.from(this.permissionCache.keys()),
        };
    }
}

export const permissionManager = new PermissionManager();
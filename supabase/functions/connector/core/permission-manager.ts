import type { ConnectorType, PermissionConfig } from "../../types.ts";
import { createClient } from "@supabase/supabase-js";
import { PermissionDeniedError, ConfigurationError } from "../../errors.ts";
import { logger } from "../../logger.ts";

const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
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

  async checkPermission(
    userId: string,
    connectorType: ConnectorType,
    permission: string,
  ): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId, connectorType);
    return permissions.includes(permission) || permissions.includes("*");
  }

  async requirePermission(
    userId: string,
    connectorType: ConnectorType,
    permission: string,
  ): Promise<void> {
    const hasPermission = await this.checkPermission(userId, connectorType, permission);
    if (!hasPermission) {
      throw new PermissionDeniedError(permission, { userId, connectorType });
    }
  }

  async requirePermissions(
    userId: string,
    connectorType: ConnectorType,
    permissions: string[],
  ): Promise<void> {
    for (const permission of permissions) {
      await this.requirePermission(userId, connectorType, permission);
    }
  }

  async getUserPermissions(userId: string, connectorType: ConnectorType): Promise<string[]> {
    const cacheKey = `${userId}:${connectorType}`;
    const cached = this.permissionCache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.permissions;
    }

    const { data: instance } = await sb
      .from("connector_instances")
      .select("config, metadata")
      .eq("user_id", userId)
      .eq("connector_type", connectorType)
      .eq("status", "active")
      .maybeSingle();

    if (!instance) {
      return [];
    }

    const config = instance.config as { permissions?: PermissionConfig };
    const metadata = instance.metadata as { grantedPermissions?: string[] } | undefined;

    let permissions: string[] = [];

    if (config.permissions?.scopes) {
      permissions = [...config.permissions.scopes];
    }

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

  async grantPermission(
    userId: string,
    connectorType: ConnectorType,
    permission: string,
  ): Promise<void> {
    const { data: instance } = await sb
      .from("connector_instances")
      .select("id, metadata")
      .eq("user_id", userId)
      .eq("connector_type", connectorType)
      .eq("status", "active")
      .maybeSingle();

    if (!instance) {
      throw new ConfigurationError("Connector instance not found");
    }

    const metadata = (instance.metadata as { grantedPermissions?: string[] }) || { grantedPermissions: [] };
    if (!metadata.grantedPermissions.includes(permission)) {
      metadata.grantedPermissions = [...metadata.grantedPermissions, permission];
      await sb
        .from("connector_instances")
        .update({ metadata })
        .eq("id", instance.id);

      this.invalidateCache(userId, connectorType);
      logger.info("Permission granted", { userId, connectorType, permission });
    }
  }

  async revokePermission(
    userId: string,
    connectorType: ConnectorType,
    permission: string,
  ): Promise<void> {
    const { data: instance } = await sb
      .from("connector_instances")
      .select("id, metadata")
      .eq("user_id", userId)
      .eq("connector_type", connectorType)
      .eq("status", "active")
      .maybeSingle();

    if (!instance) return;

    const metadata = (instance.metadata as { grantedPermissions?: string[] }) || { grantedPermissions: [] };
    metadata.grantedPermissions = metadata.grantedPermissions.filter((p) => p !== permission);

    await sb
      .from("connector_instances")
      .update({ metadata })
      .eq("id", instance.id);

    this.invalidateCache(userId, connectorType);
    logger.info("Permission revoked", { userId, connectorType, permission });
  }

  async getConnectorRequiredPermissions(connectorType: ConnectorType): Promise<string[]> {
    const { data } = await sb
      .from("connector_configs")
      .select("permissions")
      .eq("type", connectorType)
      .maybeSingle();

    return (data?.permissions as PermissionConfig)?.requiredPermissions || [];
  }

  async getConnectorOptionalPermissions(connectorType: ConnectorType): Promise<string[]> {
    const { data } = await sb
      .from("connector_configs")
      .select("permissions")
      .eq("type", connectorType)
      .maybeSingle();

    return (data?.permissions as PermissionConfig)?.optionalPermissions || [];
  }

  async validatePermissions(
    userId: string,
    connectorType: ConnectorType,
    requestedPermissions: string[],
  ): Promise<{ granted: string[]; missing: string[] }> {
    const userPermissions = await this.getUserPermissions(userId, connectorType);
    const granted: string[] = [];
    const missing: string[] = [];

    for (const permission of requestedPermissions) {
      if (userPermissions.includes(permission) || userPermissions.includes("*")) {
        granted.push(permission);
      } else {
        missing.push(permission);
      }
    }

    return { granted, missing };
  }

  invalidateCache(userId: string, connectorType: ConnectorType): void {
    const cacheKey = `${userId}:${connectorType}`;
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
import type {
  ConnectorType,
  ConnectorConfig,
  ConnectorCredentials,
  ConnectorInstance,
  ConnectorStatus,
  ConnectorResult,
  ConnectionTestResult,
} from "../../types.ts";
import { connectorRegistry } from "./connector-registry.ts";
import { createClient } from "@supabase/supabase-js";
import { ConnectorNotFoundError, AuthenticationError, ConfigurationError } from "../../errors.ts";
import { logger } from "../../logger.ts";
import { getCredentials, storeCredentials, deleteCredentials } from "../../auth.ts";

const sb = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

export interface ConnectorManagerConfig {
  maxInstancesPerUser?: number;
  defaultTimeoutMs?: number;
}

export class ConnectorManager {
  private config: Required<ConnectorManagerConfig>;
  private activeConnections: Map<string, Connector> = new Map();

  constructor(config: ConnectorManagerConfig = {}) {
    this.config = {
      maxInstancesPerUser: config.maxInstancesPerUser ?? 10,
      defaultTimeoutMs: config.defaultTimeoutMs ?? 30000,
    };
  }

  async createInstance(
    userId: string,
    connectorType: ConnectorType,
    name: string,
    credentials: ConnectorCredentials,
    metadata?: Record<string, unknown>,
  ): Promise<ConnectorInstance> {
    const registryConfig = connectorRegistry.getConfig(connectorType);

    const existingCount = await this.getUserConnectorCount(userId);
    if (existingCount >= this.config.maxInstancesPerUser) {
      throw new ConfigurationError(
        `Maximum connector instances (${this.config.maxInstancesPerUser}) reached for user`,
        { userId, connectorType },
      );
    }

    await storeCredentials(userId, connectorType, credentials);

    const instance: ConnectorInstance = {
      id: crypto.randomUUID(),
      connectorType,
      userId,
      name,
      config: registryConfig,
      credentials,
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata,
    };

    const { error } = await sb.from("connector_instances").insert({
      id: instance.id,
      connector_type: instance.connectorType,
      user_id: instance.userId,
      name: instance.name,
      config: instance.config,
      status: instance.status,
      created_at: instance.createdAt,
      updated_at: instance.updatedAt,
      metadata: instance.metadata,
    });

    if (error) {
      await deleteCredentials(userId, connectorType);
      throw new Error(`Failed to create connector instance: ${error.message}`);
    }

    logger.info("Created connector instance", {
      instanceId: instance.id,
      userId,
      connectorType,
      name,
    });

    return instance;
  }

  async getInstance(instanceId: string): Promise<ConnectorInstance | null> {
    const { data, error } = await sb
      .from("connector_instances")
      .select("*")
      .eq("id", instanceId)
      .maybeSingle();

    if (error || !data) return null;

    const credentials = await getCredentials(data.user_id, data.connector_type);
    if (!credentials) return null;

    return {
      id: data.id,
      connectorType: data.connector_type,
      userId: data.user_id,
      name: data.name,
      config: data.config as ConnectorConfig,
      credentials,
      status: data.status,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      lastUsedAt: data.last_used_at,
      metadata: data.metadata,
    };
  }

  async getUserInstances(userId: string): Promise<ConnectorInstance[]> {
    const { data, error } = await sb
      .from("connector_instances")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(`Failed to get user instances: ${error.message}`);

    const instances: ConnectorInstance[] = [];
    for (const row of data || []) {
      const credentials = await getCredentials(row.user_id, row.connector_type);
      if (credentials) {
        instances.push({
          id: row.id,
          connectorType: row.connector_type,
          userId: row.user_id,
          name: row.name,
          config: row.config as ConnectorConfig,
          credentials,
          status: row.status,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          lastUsedAt: row.last_used_at,
          metadata: row.metadata,
        });
      }
    }

    return instances;
  }

  async updateInstance(
    instanceId: string,
    updates: Partial<Pick<ConnectorInstance, "name" | "status" | "metadata">>,
  ): Promise<ConnectorInstance | null> {
    const instance = await this.getInstance(instanceId);
    if (!instance) return null;

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.name) updateData.name = updates.name;
    if (updates.status) updateData.status = updates.status;
    if (updates.metadata) updateData.metadata = updates.metadata;

    const { error } = await sb
      .from("connector_instances")
      .update(updateData)
      .eq("id", instanceId);

    if (error) throw new Error(`Failed to update instance: ${error.message}`);

    return { ...instance, ...updates, updatedAt: updateData.updated_at as string };
  }

  async deleteInstance(instanceId: string): Promise<boolean> {
    const instance = await this.getInstance(instanceId);
    if (!instance) return false;

    await deleteCredentials(instance.userId, instance.connectorType);

    const { error } = await sb
      .from("connector_instances")
      .delete()
      .eq("id", instanceId);

    if (error) throw new Error(`Failed to delete instance: ${error.message}`);

    const connectionKey = `${instance.userId}:${instance.connectorType}:${instanceId}`;
    const connector = this.activeConnections.get(connectionKey);
    if (connector) {
      await connector.destroy();
      this.activeConnections.delete(connectionKey);
    }

    logger.info("Deleted connector instance", { instanceId, userId: instance.userId });
    return true;
  }

  async getConnector(instanceId: string): Promise<Connector> {
    const connectionKey = instanceId;

    let connector = this.activeConnections.get(connectionKey);
    if (connector) {
      return connector;
    }

    const instance = await this.getInstance(instanceId);
    if (!instance) {
      throw new ConnectorNotFoundError(instanceId);
    }

    if (instance.status !== "active") {
      throw new AuthenticationError(`Connector instance is ${instance.status}`);
    }

    connector = connectorRegistry.createConnector(instance.connectorType, instance.credentials);
    await connector.initialize();

    this.activeConnections.set(connectionKey, connector);
    return connector;
  }

  async testConnection(instanceId: string): Promise<ConnectionTestResult> {
    const connector = await this.getConnector(instanceId);
    const result = await connector.testConnection();

    await this.updateLastUsed(instanceId);
    return result;
  }

  async executeAction(
    instanceId: string,
    action: string,
    params: Record<string, unknown>,
  ): Promise<ConnectorResult> {
    const connector = await this.getConnector(instanceId);
    const result = await connector.execute(action, params);

    await this.updateLastUsed(instanceId);
    return result;
  }

  async updateLastUsed(instanceId: string): Promise<void> {
    await sb
      .from("connector_instances")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", instanceId);
  }

  private async getUserConnectorCount(userId: string): Promise<number> {
    const { count, error } = await sb
      .from("connector_instances")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    if (error) throw new Error(`Failed to count user connectors: ${error.message}`);
    return count ?? 0;
  }

  async releaseConnector(instanceId: string): Promise<void> {
    const connector = this.activeConnections.get(instanceId);
    if (connector) {
      await connector.destroy();
      this.activeConnections.delete(instanceId);
    }
  }

  async releaseAllForUser(userId: string): Promise<void> {
    const instances = await this.getUserInstances(userId);
    for (const instance of instances) {
      await this.releaseConnector(instance.id);
    }
  }

  getActiveConnectionCount(): number {
    return this.activeConnections.size;
  }
}

export const connectorManager = new ConnectorManager();
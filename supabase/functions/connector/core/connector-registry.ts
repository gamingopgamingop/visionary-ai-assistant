import type {
  ConnectorType,
  ConnectorConfig,
  ConnectorRegistryEntry,
  ConnectorFactory,
  Connector,
  ConnectorCredentials,
} from "../types.ts";
import { ConnectorNotFoundError, ConfigurationError } from "../errors.ts";
import { logger } from "../logger.ts";

export class ConnectorRegistry {
  private static instance: ConnectorRegistry;
  private connectors: Map<ConnectorType, ConnectorRegistryEntry> = new Map();
  private factories: Map<ConnectorType, ConnectorFactory> = new Map();

  private constructor() {}

  static getInstance(): ConnectorRegistry {
    if (!ConnectorRegistry.instance) {
      ConnectorRegistry.instance = new ConnectorRegistry();
    }
    return ConnectorRegistry.instance;
  }

  register(type: ConnectorType, factory: ConnectorFactory, config: ConnectorConfig): void {
    if (this.connectors.has(type)) {
      logger.warn(`Connector ${type} already registered, overwriting`);
    }

    this.factories.set(type, factory);
    this.connectors.set(type, { type, factory, config });
    logger.info(`Registered connector: ${type}`, { displayName: config.displayName });
  }

  unregister(type: ConnectorType): boolean {
    const deleted = this.connectors.delete(type);
    this.factories.delete(type);
    if (deleted) {
      logger.info(`Unregistered connector: ${type}`);
    }
    return deleted;
  }

  getConfig(type: ConnectorType): ConnectorConfig {
    const entry = this.connectors.get(type);
    if (!entry) {
      throw new ConnectorNotFoundError(type);
    }
    return entry.config;
  }

  getFactory(type: ConnectorType): ConnectorFactory {
    const factory = this.factories.get(type);
    if (!factory) {
      throw new ConnectorNotFoundError(type);
    }
    return factory;
  }

  createConnector(type: ConnectorType, credentials: ConnectorCredentials): Connector {
    const factory = this.getFactory(type);
    const config = this.getConfig(type);
    return factory(config, credentials);
  }

  hasConnector(type: ConnectorType): boolean {
    return this.connectors.has(type);
  }

  listConnectors(): ConnectorConfig[] {
    return Array.from(this.connectors.values()).map((entry) => entry.config);
  }

  getConnectorTypes(): ConnectorType[] {
    return Array.from(this.connectors.keys());
  }

  validateConfig(type: ConnectorType, config: Partial<ConnectorConfig>): void {
    const entry = this.connectors.get(type);
    if (!entry) {
      throw new ConnectorNotFoundError(type);
    }

    const requiredFields: (keyof ConnectorConfig)[] = [
      "type",
      "name",
      "displayName",
      "auth",
      "baseUrl",
      "endpoints",
    ];

    for (const field of requiredFields) {
      if (!(field in config)) {
        throw new ConfigurationError(`Missing required field: ${field}`, { connectorType: type });
      }
    }

    if (config.type !== type) {
      throw new ConfigurationError(`Connector type mismatch: expected ${type}, got ${config.type}`);
    }
  }

  clear(): void {
    this.connectors.clear();
    this.factories.clear();
    logger.info("Connector registry cleared");
  }
}

export const connectorRegistry = ConnectorRegistry.getInstance();
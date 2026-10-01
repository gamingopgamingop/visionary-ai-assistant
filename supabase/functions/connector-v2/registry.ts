import type { ConnectorConfig, ConnectorAuthType } from './types.ts';

export interface ConnectorRegistryEntry {
    config: ConnectorConfig;
    factory: ConnectorFactory;
}

export type ConnectorFactory = (config: ConnectorConfig, credentials: Record<string, unknown>) => ConnectorInstance;

export interface ConnectorInstance {
    config: ConnectorConfig;
    credentials: Record<string, unknown>;
    initialize(): Promise<void>;
    testConnection(): Promise<ConnectionTestResult>;
    execute(action: string, params: Record<string, unknown>): Promise<ConnectorActionResult>;
    getWebhookHandler?(): WebhookHandler;
    destroy(): Promise<void>;
}

export interface ConnectionTestResult {
    success: boolean;
    message?: string;
    data?: Record<string, unknown>;
}

export interface ConnectorActionResult {
    success: boolean;
    data?: unknown;
    error?: ConnectorError;
    metadata?: Record<string, unknown>;
}

export interface ConnectorError {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    retryable?: boolean;
    statusCode?: number;
}

export interface WebhookHandler {
    verify(payload: string, signature: string): Promise<boolean>;
    handle(event: WebhookEvent): Promise<WebhookResult>;
}

export interface WebhookEvent {
    id: string;
    type: string;
    timestamp: string;
    payload: Record<string, unknown>;
    headers: Record<string, string>;
}

export interface WebhookResult {
    success: boolean;
    message?: string;
    data?: unknown;
}

export class ConnectorRegistry {
    private static instance: ConnectorRegistry;
    private connectors: Map<string, ConnectorRegistryEntry> = new Map();
    private enabledConnectors: Set<string> = new Set();

    private constructor() {}

    static getInstance(): ConnectorRegistry {
        if (!ConnectorRegistry.instance) {
            ConnectorRegistry.instance = new ConnectorRegistry();
        }
        return ConnectorRegistry.instance;
    }

    register(config: ConnectorConfig, factory: ConnectorFactory): void {
        if (this.connectors.has(config.id)) {
            console.warn(`Connector ${config.id} already registered, overwriting`);
        }

        this.connectors.set(config.id, { config, factory });
        
        if (config.enabled) {
            this.enabledConnectors.add(config.id);
        }

        console.log(`Registered connector: ${config.id} (${config.displayName})`);
    }

    unregister(connectorId: string): boolean {
        this.enabledConnectors.delete(connectorId);
        return this.connectors.delete(connectorId);
    }

    getConfig(connectorId: string): ConnectorConfig {
        const entry = this.connectors.get(connectorId);
        if (!entry) {
            throw new Error(`Connector not found: ${connectorId}`);
        }
        return entry.config;
    }

    getFactory(connectorId: string): ConnectorFactory {
        const entry = this.connectors.get(connectorId);
        if (!entry) {
            throw new Error(`Connector not found: ${connectorId}`);
        }
        return entry.factory;
    }

    createInstance(connectorId: string, credentials: Record<string, unknown>): ConnectorInstance {
        const factory = this.getFactory(connectorId);
        const config = this.getConfig(connectorId);
        return factory(config, credentials);
    }

    isEnabled(connectorId: string): boolean {
        return this.enabledConnectors.has(connectorId);
    }

    enable(connectorId: string): void {
        const entry = this.connectors.get(connectorId);
        if (entry) {
            this.enabledConnectors.add(connectorId);
            entry.config.enabled = true;
        }
    }

    disable(connectorId: string): void {
        this.enabledConnectors.delete(connectorId);
        const entry = this.connectors.get(connectorId);
        if (entry) {
            entry.config.enabled = false;
        }
    }

    hasConnector(connectorId: string): boolean {
        return this.connectors.has(connectorId);
    }

    listConnectors(): ConnectorConfig[] {
        return Array.from(this.connectors.values()).map(entry => entry.config);
    }

    listEnabledConnectors(): ConnectorConfig[] {
        return Array.from(this.enabledConnectors)
            .map(id => this.connectors.get(id)?.config)
            .filter((c): c is ConnectorConfig => c !== undefined);
    }

    getConnectorIds(): string[] {
        return Array.from(this.connectors.keys());
    }

    getEnabledConnectorIds(): string[] {
        return Array.from(this.enabledConnectors);
    }

    getConnectorsByCategory(category: string): ConnectorConfig[] {
        return this.listConnectors().filter(c => c.category === category);
    }

    getConnectorsByAuthType(authType: ConnectorAuthType): ConnectorConfig[] {
        return this.listConnectors().filter(c => c.authType === authType);
    }

    validateConfig(connectorId: string, config: Partial<ConnectorConfig>): void {
        const entry = this.connectors.get(connectorId);
        if (!entry) {
            throw new Error(`Connector not found: ${connectorId}`);
        }

        const requiredFields: (keyof ConnectorConfig)[] = [
            'id', 'name', 'displayName', 'authType', 'baseUrl', 'endpoints'
        ];

        for (const field of requiredFields) {
            if (!(field in config)) {
                throw new Error(`Missing required field: ${field}`);
            }
        }

        if (config.id !== connectorId) {
            throw new Error(`Connector ID mismatch: expected ${connectorId}, got ${config.id}`);
        }
    }

    clear(): void {
        this.connectors.clear();
        this.enabledConnectors.clear();
        console.log('Connector registry cleared');
    }
}

export const connectorRegistry = ConnectorRegistry.getInstance();
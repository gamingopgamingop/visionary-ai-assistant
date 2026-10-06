import { ConnectorRegistry } from '../registry.ts';
import type { ConnectorConfig, ConnectorAuthType } from '../types.ts';

Deno.test("ConnectorRegistry - singleton", () => {
    const registry1 = ConnectorRegistry.getInstance();
    const registry2 = ConnectorRegistry.getInstance();
    
    if (registry1 !== registry2) throw new Error("Should be singleton");
});

Deno.test("ConnectorRegistry - register and get", () => {
    const registry = ConnectorRegistry.getInstance();
    registry.clear();
    
    const config: ConnectorConfig = {
        id: "test",
        name: "test",
        displayName: "Test Connector",
        description: "Test",
        category: "test",
        version: "1.0.0",
        authType: "none" as ConnectorAuthType,
        baseUrl: "https://api.test.com",
        endpoints: {},
        requiredPermissions: [],
        optionalPermissions: [],
        enabled: true,
    };
    
    const factory = (config: ConnectorConfig) => ({} as any);
    
    registry.register(config, factory);
    
    if (!registry.hasConnector("test")) throw new Error("Should have connector");
    if (registry.getConfig("test").id !== "test") throw new Error("Config mismatch");
});

Deno.test("ConnectorRegistry - enable/disable", () => {
    const registry = ConnectorRegistry.getInstance();
    registry.clear();
    
    const config: ConnectorConfig = {
        id: "test2",
        name: "test2",
        displayName: "Test Connector 2",
        description: "Test",
        category: "test",
        version: "1.0.0",
        authType: "none" as ConnectorAuthType,
        baseUrl: "https://api.test.com",
        endpoints: {},
        requiredPermissions: [],
        optionalPermissions: [],
        enabled: false,
    };
    
    const factory = (config: ConnectorConfig) => ({} as any);
    
    registry.register(config, factory);
    
    if (registry.isEnabled("test2")) throw new Error("Should be disabled by default");
    
    registry.enable("test2");
    if (!registry.isEnabled("test2")) throw new Error("Should be enabled");
    
    registry.disable("test2");
    if (registry.isEnabled("test2")) throw new Error("Should be disabled again");
});

Deno.test("ConnectorRegistry - list connectors", () => {
    const registry = ConnectorRegistry.getInstance();
    registry.clear();
    
    const config1: ConnectorConfig = {
        id: "conn1",
        name: "conn1",
        displayName: "Connector 1",
        description: "Test",
        category: "cat1",
        version: "1.0.0",
        authType: "none" as ConnectorAuthType,
        baseUrl: "https://api.test.com",
        endpoints: {},
        requiredPermissions: [],
        optionalPermissions: [],
        enabled: true,
    };
    
    const config2: ConnectorConfig = {
        id: "conn2",
        name: "conn2",
        displayName: "Connector 2",
        description: "Test",
        category: "cat2",
        version: "1.0.0",
        authType: "none" as ConnectorAuthType,
        baseUrl: "https://api.test.com",
        endpoints: {},
        requiredPermissions: [],
        optionalPermissions: [],
        enabled: true,
    };
    
    registry.register(config1, () => ({} as any));
    registry.register(config2, () => ({} as any));
    
    const all = registry.listConnectors();
    if (all.length !== 2) throw new Error("Should have 2 connectors");
    
    const enabled = registry.listEnabledConnectors();
    if (enabled.length !== 2) throw new Error("Should have 2 enabled connectors");
    
    const cat1 = registry.getConnectorsByCategory("cat1");
    if (cat1.length !== 1) throw new Error("Should have 1 connector in cat1");
    
    const none = registry.getConnectorsByCategory("nonexistent");
    if (none.length !== 0) throw new Error("Should have 0 connectors in nonexistent category");
});

Deno.test("ConnectorRegistry - auth type filter", () => {
    const registry = ConnectorRegistry.getInstance();
    registry.clear();
    
    const config1: ConnectorConfig = {
        id: "oauth",
        name: "oauth",
        displayName: "OAuth Connector",
        description: "Test",
        category: "test",
        version: "1.0.0",
        authType: "oauth2" as ConnectorAuthType,
        baseUrl: "https://api.test.com",
        endpoints: {},
        requiredPermissions: [],
        optionalPermissions: [],
        enabled: true,
    };
    
    const config2: ConnectorConfig = {
        id: "apikey",
        name: "apikey",
        displayName: "API Key Connector",
        description: "Test",
        category: "test",
        version: "1.0.0",
        authType: "api_key" as ConnectorAuthType,
        baseUrl: "https://api.test.com",
        endpoints: {},
        requiredPermissions: [],
        optionalPermissions: [],
        enabled: true,
    };
    
    registry.register(config1, () => ({} as any));
    registry.register(config2, () => ({} as any));
    
    const oauth = registry.getConnectorsByAuthType("oauth2");
    if (oauth.length !== 1) throw new Error("Should have 1 oauth2 connector");
    
    const apikey = registry.getConnectorsByAuthType("api_key");
    if (apikey.length !== 1) throw new Error("Should have 1 api_key connector");
});
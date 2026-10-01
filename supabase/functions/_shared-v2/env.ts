export function getEnv(key: string, defaultValue?: string): string {
    const value = Deno.env.get(key);
    if (value === undefined) {
        if (defaultValue !== undefined) {
            return defaultValue;
        }
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
}

export function getEnvBool(key: string, defaultValue: boolean = false): boolean {
    const value = Deno.env.get(key);
    if (value === undefined) return defaultValue;
    return value.toLowerCase() === 'true' || value === '1';
}

export function getEnvNumber(key: string, defaultValue?: number): number {
    const value = Deno.env.get(key);
    if (value === undefined) {
        if (defaultValue !== undefined) return defaultValue;
        throw new Error(`Missing required environment variable: ${key}`);
    }
    const parsed = parseFloat(value);
    if (isNaN(parsed)) {
        throw new Error(`Invalid number for environment variable: ${key}`);
    }
    return parsed;
}

export function getEnvArray(key: string, defaultValue: string[] = []): string[] {
    const value = Deno.env.get(key);
    if (value === undefined) return defaultValue;
    return value.split(',').map(s => s.trim()).filter(Boolean);
}

export const FeatureFlags = {
    NEW_AUTH_ENABLED: getEnvBool('NEW_AUTH_ENABLED', false),
    NEW_CONNECTOR_ENGINE_ENABLED: getEnvBool('NEW_CONNECTOR_ENGINE_ENABLED', false),
    NEW_API_KEYS_ENABLED: getEnvBool('NEW_API_KEYS_ENABLED', false),
    NEW_AUDIT_ENABLED: getEnvBool('NEW_AUDIT_ENABLED', false),
    NEW_AI_GATEWAY_ENABLED: getEnvBool('NEW_AI_GATEWAY_ENABLED', false),
    NEW_QUOTA_ENABLED: getEnvBool('NEW_QUOTA_ENABLED', false),
    NEW_RBAC_ENABLED: getEnvBool('NEW_RBAC_ENABLED', false),
};

export const Config = {
    SUPABASE_URL: getEnv('SUPABASE_URL'),
    SUPABASE_SERVICE_ROLE_KEY: getEnv('SUPABASE_SERVICE_ROLE_KEY'),
    SUPABASE_JWT_SECRET: getEnv('SUPABASE_JWT_SECRET'),
    SUPABASE_JWT_ISSUER: getEnv('SUPABASE_JWT_ISSUER'),
    SUPABASE_JWT_AUDIENCE: getEnv('SUPABASE_JWT_AUDIENCE'),
    CONNECTOR_ENCRYPTION_KEY: getEnv('CONNECTOR_ENCRYPTION_KEY'),
    API_KEY_PREFIX: getEnv('API_KEY_PREFIX', 'vk'),
    API_KEY_DEFAULT_EXPIRY_DAYS: getEnvNumber('API_KEY_DEFAULT_EXPIRY_DAYS', 90),
    API_KEY_MAX_PER_USER: getEnvNumber('API_KEY_MAX_PER_USER', 10),
    AUDIT_RETENTION_DAYS: getEnvNumber('AUDIT_RETENTION_DAYS', 365),
    AUDIT_BATCH_SIZE: getEnvNumber('AUDIT_BATCH_SIZE', 100),
    AUDIT_FLUSH_INTERVAL_MS: getEnvNumber('AUDIT_FLUSH_INTERVAL_MS', 5000),
};
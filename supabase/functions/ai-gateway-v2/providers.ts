import { createClient } from '@supabase/supabase-js';
import type { ProviderConfig, ProviderType } from './types.ts';

const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

export async function getProviders(enabledOnly: boolean = false): Promise<ProviderConfig[]> {
    let query = supabase.from('ai_providers').select('*').order('priority', { ascending: false });
    
    if (enabledOnly) {
        query = query.eq('enabled', true);
    }

    const { data, error } = await query;

    if (error) throw new Error(`Failed to get providers: ${error.message}`);
    return (data || []).map(mapRowToProvider);
}

export async function getProvider(providerId: string): Promise<ProviderConfig | null> {
    const { data, error } = await supabase
        .from('ai_providers')
        .select('*')
        .eq('id', providerId)
        .maybeSingle();

    if (error || !data) return null;
    return mapRowToProvider(data);
}

export async function getProviderByName(name: string): Promise<ProviderConfig | null> {
    const { data, error } = await supabase
        .from('ai_providers')
        .select('*')
        .eq('name', name)
        .maybeSingle();

    if (error || !data) return null;
    return mapRowToProvider(data);
}

export async function createProvider(config: Omit<ProviderConfig, 'id'>): Promise<ProviderConfig> {
    const providerId = crypto.randomUUID();
    const now = new Date().toISOString();

    const { error } = await supabase.from('ai_providers').insert({
        id: providerId,
        name: config.name,
        display_name: config.displayName,
        type: config.type,
        base_url: config.baseUrl,
        api_key_env: config.apiKeyEnv,
        enabled: config.enabled,
        priority: config.priority,
        health_check_url: config.healthCheckUrl,
        health_check_interval_ms: config.healthCheckIntervalMs,
        config: config.config,
        created_at: now,
        updated_at: now,
    });

    if (error) throw new Error(`Failed to create provider: ${error.message}`);

    return { ...config, id: providerId };
}

export async function updateProvider(providerId: string, updates: Partial<ProviderConfig>): Promise<void> {
    const { error } = await supabase
        .from('ai_providers')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', providerId);

    if (error) throw new Error(`Failed to update provider: ${error.message}`);
}

export async function deleteProvider(providerId: string): Promise<void> {
    const { error } = await supabase
        .from('ai_providers')
        .delete()
        .eq('id', providerId);

    if (error) throw new Error(`Failed to delete provider: ${error.message}`);
}

export async function getProviderApiKey(providerId: string): Promise<string | null> {
    const provider = await getProvider(providerId);
    if (!provider) return null;

    if (provider.apiKey) {
        return provider.apiKey;
    }

    if (provider.apiKeyEnv) {
        return Deno.env.get(provider.apiKeyEnv) || null;
    }

    return null;
}

export async function getEnabledProvidersByType(type: ProviderType): Promise<ProviderConfig[]> {
    const { data, error } = await supabase
        .from('ai_providers')
        .select('*')
        .eq('type', type)
        .eq('enabled', true)
        .order('priority', { ascending: false });

    if (error) throw new Error(`Failed to get providers by type: ${error.message}`);
    return (data || []).map(mapRowToProvider);
}

export async function getProvidersForModel(modelId: string): Promise<ProviderConfig[]> {
    const { data: models, error } = await supabase
        .from('ai_models')
        .select('provider_id')
        .eq('model_id', modelId)
        .eq('status', 'active');

    if (error || !models || models.length === 0) return [];

    const providerIds = [...new Set(models.map(m => m.provider_id))];
    
    const { data: providers, error: providersError } = await supabase
        .from('ai_providers')
        .select('*')
        .in('id', providerIds)
        .eq('enabled', true)
        .order('priority', { ascending: false });

    if (providersError) throw new Error(`Failed to get providers for model: ${providersError.message}`);
    return (providers || []).map(mapRowToProvider);
}

function mapRowToProvider(row: any): ProviderConfig {
    return {
        id: row.id,
        name: row.name,
        displayName: row.display_name,
        type: row.type,
        baseUrl: row.base_url,
        apiKeyEnv: row.api_key_env,
        enabled: row.enabled,
        priority: row.priority,
        healthCheckUrl: row.health_check_url,
        healthCheckIntervalMs: row.health_check_interval_ms,
        config: row.config || {},
        rateLimits: row.rate_limits,
        supportedModels: row.supported_models || [],
    };
}

export const PROVIDER_TYPES: ProviderType[] = [
    'openai',
    'anthropic',
    'gemini',
    'huggingface',
    'nvidia',
    'ollama',
    'vllm',
    'openai_compatible',
];

export function getDefaultProviderConfig(type: ProviderType): Partial<ProviderConfig> {
    const defaults: Record<ProviderType, Partial<ProviderConfig>> = {
        openai: {
            baseUrl: 'https://api.openai.com/v1',
            healthCheckUrl: 'https://api.openai.com/v1/models',
            healthCheckIntervalMs: 60000,
        },
        anthropic: {
            baseUrl: 'https://api.anthropic.com/v1',
            healthCheckUrl: 'https://api.anthropic.com/v1/messages',
            healthCheckIntervalMs: 60000,
        },
        gemini: {
            baseUrl: 'https://generativelanguage.googleapis.com/v1',
            healthCheckUrl: 'https://generativelanguage.googleapis.com/v1/models',
            healthCheckIntervalMs: 60000,
        },
        huggingface: {
            baseUrl: 'https://api-inference.huggingface.co',
            healthCheckUrl: 'https://huggingface.co/api/models',
            healthCheckIntervalMs: 60000,
        },
        nvidia: {
            baseUrl: 'https://integrate.api.nvidia.com/v1',
            healthCheckUrl: 'https://integrate.api.nvidia.com/v1/models',
            healthCheckIntervalMs: 60000,
        },
        ollama: {
            baseUrl: 'http://localhost:11434/v1',
            healthCheckUrl: 'http://localhost:11434/api/tags',
            healthCheckIntervalMs: 30000,
        },
        vllm: {
            baseUrl: 'http://localhost:8000/v1',
            healthCheckUrl: 'http://localhost:8000/v1/models',
            healthCheckIntervalMs: 30000,
        },
        openai_compatible: {
            baseUrl: '',
            healthCheckUrl: '',
            healthCheckIntervalMs: 60000,
        },
    };

    return defaults[type] || {};
}
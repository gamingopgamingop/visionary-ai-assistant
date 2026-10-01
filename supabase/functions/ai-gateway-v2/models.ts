import { createClient } from '@supabase/supabase-js';
import type { ModelConfig, ModelCapability, ModelStatus, HealthStatus } from './types.ts';

const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

export async function getModels(filters?: {
    providerId?: string;
    status?: ModelStatus;
    capability?: ModelCapability;
}): Promise<ModelConfig[]> {
    let query = supabase.from('ai_models').select('*').order('priority', { ascending: false });

    if (filters?.providerId) {
        query = query.eq('provider_id', filters.providerId);
    }
    if (filters?.status) {
        query = query.eq('status', filters.status);
    }
    if (filters?.capability) {
        query = query.contains('capabilities', [filters.capability]);
    }

    const { data, error } = await query;

    if (error) throw new Error(`Failed to get models: ${error.message}`);
    return (data || []).map(mapRowToModel);
}

export async function getModel(modelId: string): Promise<ModelConfig | null> {
    const { data, error } = await supabase
        .from('ai_models')
        .select('*')
        .eq('id', modelId)
        .maybeSingle();

    if (error || !data) return null;
    return mapRowToModel(data);
}

export async function getModelByProviderAndId(providerId: string, modelId: string): Promise<ModelConfig | null> {
    const { data, error } = await supabase
        .from('ai_models')
        .select('*')
        .eq('provider_id', providerId)
        .eq('model_id', modelId)
        .maybeSingle();

    if (error || !data) return null;
    return mapRowToModel(data);
}

export async function createModel(config: Omit<ModelConfig, 'id'>): Promise<ModelConfig> {
    const modelId = crypto.randomUUID();
    const now = new Date().toISOString();

    const { error } = await supabase.from('ai_models').insert({
        id: modelId,
        provider_id: config.providerId,
        model_id: config.modelId,
        display_name: config.displayName,
        capabilities: config.capabilities,
        context_length: config.contextLength,
        max_output_tokens: config.maxOutputTokens,
        input_cost_per_1k_tokens: config.inputCostPer1kTokens,
        output_cost_per_1k_tokens: config.outputCostPer1kTokens,
        status: config.status,
        priority: config.priority,
        health_status: config.healthStatus,
        last_health_check: config.lastHealthCheck,
        config: config.config,
        created_at: now,
        updated_at: now,
    });

    if (error) throw new Error(`Failed to create model: ${error.message}`);

    return { ...config, id: modelId };
}

export async function updateModel(modelId: string, updates: Partial<ModelConfig>): Promise<void> {
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (updates.displayName) updateData.display_name = updates.displayName;
    if (updates.capabilities) updateData.capabilities = updates.capabilities;
    if (updates.contextLength) updateData.context_length = updates.contextLength;
    if (updates.maxOutputTokens) updateData.max_output_tokens = updates.maxOutputTokens;
    if (updates.inputCostPer1kTokens) updateData.input_cost_per_1k_tokens = updates.inputCostPer1kTokens;
    if (updates.outputCostPer1kTokens) updateData.output_cost_per_1k_tokens = updates.outputCostPer1kTokens;
    if (updates.status) updateData.status = updates.status;
    if (updates.priority) updateData.priority = updates.priority;
    if (updates.healthStatus) updateData.health_status = updates.healthStatus;
    if (updates.lastHealthCheck) updateData.last_health_check = updates.lastHealthCheck;
    if (updates.config) updateData.config = updates.config;

    const { error } = await supabase
        .from('ai_models')
        .update(updateData)
        .eq('id', modelId);

    if (error) throw new Error(`Failed to update model: ${error.message}`);
}

export async function deleteModel(modelId: string): Promise<void> {
    const { error } = await supabase
        .from('ai_models')
        .delete()
        .eq('id', modelId);

    if (error) throw new Error(`Failed to delete model: ${error.message}`);
}

export async function getModelsForCapability(capability: ModelCapability): Promise<ModelConfig[]> {
    const { data, error } = await supabase
        .from('ai_models')
        .select('*')
        .contains('capabilities', [capability])
        .eq('status', 'active')
        .order('priority', { ascending: false });

    if (error) throw new Error(`Failed to get models for capability: ${error.message}`);
    return (data || []).map(mapRowToModel);
}

export async function getBestModelForCapability(
    capability: ModelCapability,
    providerPriority?: string[]
): Promise<ModelConfig | null> {
    let query = supabase
        .from('ai_models')
        .select('*')
        .contains('capabilities', [capability])
        .eq('status', 'active')
        .eq('health_status', 'healthy')
        .order('priority', { ascending: false });

    const { data, error } = await query;

    if (error || !data || data.length === 0) return null;

    if (providerPriority && providerPriority.length > 0) {
        const prioritized = data.filter(m => providerPriority.includes(m.provider_id));
        if (prioritized.length > 0) {
            return mapRowToModel(prioritized[0]);
        }
    }

    return mapRowToModel(data[0]);
}

export async function updateModelHealth(
    modelId: string,
    healthStatus: HealthStatus,
    latencyMs?: number,
    error?: string
): Promise<void> {
    const updates: Record<string, unknown> = {
        health_status: healthStatus,
        last_health_check: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };

    if (error) {
        updates.config = { ...updates.config, last_health_error: error };
    }

    const { error: updateError } = await supabase
        .from('ai_models')
        .update(updates)
        .eq('id', modelId);

    if (updateError) throw new Error(`Failed to update model health: ${updateError.message}`);
}

function mapRowToModel(row: any): ModelConfig {
    return {
        id: row.id,
        providerId: row.provider_id,
        modelId: row.model_id,
        displayName: row.display_name,
        capabilities: row.capabilities || [],
        contextLength: row.context_length,
        maxOutputTokens: row.max_output_tokens,
        inputCostPer1kTokens: row.input_cost_per_1k_tokens,
        outputCostPer1kTokens: row.output_cost_per_1k_tokens,
        status: row.status,
        priority: row.priority,
        healthStatus: row.health_status,
        lastHealthCheck: row.last_health_check,
        config: row.config || {},
    };
}

export const MODEL_CAPABILITIES: ModelCapability[] = [
    'chat',
    'completion',
    'embeddings',
    'images',
    'audio',
    'video',
    'code',
    'reasoning',
];

export const MODEL_STATUSES: ModelStatus[] = ['active', 'deprecated', 'disabled'];
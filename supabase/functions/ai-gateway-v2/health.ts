import { createClient } from '@supabase/supabase-js';
import type { ProviderConfig, ModelConfig, ProviderHealth, ModelHealth, HealthStatus } from './types.ts';
import { getProviders } from './providers.ts';
import { getModels } from './models.ts';

const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

export async function checkProviderHealth(provider: ProviderConfig): Promise<ProviderHealth> {
    if (!provider.healthCheckUrl) {
        return {
            providerId: provider.id,
            status: 'unknown',
            lastCheck: new Date().toISOString(),
        };
    }

    const startTime = Date.now();
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(provider.healthCheckUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const latencyMs = Date.now() - startTime;

        if (response.ok) {
            return {
                providerId: provider.id,
                status: 'healthy',
                latencyMs,
                lastCheck: new Date().toISOString(),
            };
        } else {
            return {
                providerId: provider.id,
                status: 'degraded',
                latencyMs,
                error: `HTTP ${response.status}`,
                lastCheck: new Date().toISOString(),
            };
        }
    } catch (error) {
        const latencyMs = Date.now() - startTime;
        return {
            providerId: provider.id,
            status: 'unhealthy',
            latencyMs,
            error: (error as Error).message,
            lastCheck: new Date().toISOString(),
        };
    }
}

export async function checkModelHealth(model: ModelConfig): Promise<ModelHealth> {
    const provider = await getProvider(model.providerId);
    if (!provider || !provider.baseUrl) {
        return {
            modelId: model.id,
            providerId: model.providerId,
            status: 'unknown',
            lastCheck: new Date().toISOString(),
        };
    }

    const startTime = Date.now();
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(`${provider.baseUrl}/models/${model.modelId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const latencyMs = Date.now() - startTime;

        if (response.ok) {
            return {
                modelId: model.id,
                providerId: model.providerId,
                status: 'healthy',
                latencyMs,
                lastCheck: new Date().toISOString(),
            };
        } else if (response.status === 404) {
            return {
                modelId: model.id,
                providerId: model.providerId,
                status: 'unhealthy',
                latencyMs,
                error: 'Model not found',
                lastCheck: new Date().toISOString(),
            };
        } else {
            return {
                modelId: model.id,
                providerId: model.providerId,
                status: 'degraded',
                latencyMs,
                error: `HTTP ${response.status}`,
                lastCheck: new Date().toISOString(),
            };
        }
    } catch (error) {
        const latencyMs = Date.now() - startTime;
        return {
            modelId: model.id,
            providerId: model.providerId,
            status: 'unhealthy',
            latencyMs,
            error: (error as Error).message,
            lastCheck: new Date().toISOString(),
        };
    }
}

export async function runHealthChecks(): Promise<{ providers: ProviderHealth[]; models: ModelHealth[] }> {
    const providers = await getProviders(true);
    const models = await getModels({ status: 'active' });

    const providerHealth = await Promise.all(
        providers.map(p => checkProviderHealth(p))
    );

    const modelHealth = await Promise.all(
        models.map(m => checkModelHealth(m))
    );

    for (const health of providerHealth) {
        await supabase.from('ai_providers').update({
            config: { ...health, last_health_check: health.lastCheck },
        }).eq('id', health.providerId);
    }

    for (const health of modelHealth) {
        await supabase.from('ai_models').update({
            health_status: health.status,
            last_health_check: health.lastCheck,
            config: { ...health.config, last_health_error: health.error },
        }).eq('id', health.modelId);
    }

    return { providers: providerHealth, models: modelHealth };
}

export async function getProviderHealthStatus(providerId: string): Promise<ProviderHealth | null> {
    const provider = await getProvider(providerId);
    if (!provider) return null;
    return checkProviderHealth(provider);
}

export async function getModelHealthStatus(modelId: string): Promise<ModelHealth | null> {
    const model = await getModel(modelId);
    if (!model) return null;
    return checkModelHealth(model);
}

export function getHealthStatusPriority(status: HealthStatus): number {
    const priorities: Record<HealthStatus, number> = {
        healthy: 0,
        degraded: 1,
        unhealthy: 2,
        unknown: 3,
    };
    return priorities[status] ?? 3;
}

export function selectHealthiestProvider(providers: ProviderConfig[]): ProviderConfig | null {
    const healthy = providers.filter(p => {
        // This would need actual health data from recent checks
        return true;
    });
    
    if (healthy.length === 0) return null;
    
    return healthy.reduce((best, current) => 
        current.priority > best.priority ? current : best
    );
}

export function selectHealthiestModel(models: ModelConfig[]): ModelConfig | null {
    const healthy = models.filter(m => m.healthStatus === 'healthy');
    
    if (healthy.length === 0) {
        const degraded = models.filter(m => m.healthStatus === 'degraded');
        if (degraded.length === 0) return null;
        return degraded.reduce((best, current) => 
            current.priority > best.priority ? current : best
        );
    }
    
    return healthy.reduce((best, current) => 
        current.priority > best.priority ? current : best
    );
}
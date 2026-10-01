import type { ProviderConfig, ModelConfig, ChatRequest, ChatResponse, AiGatewayConfig } from './types.ts';
import { getProvidersForModel } from './providers.ts';
import { selectHealthiestProvider } from './health.ts';

export interface FallbackConfig {
    enabled: boolean;
    maxRetries: number;
    retryDelayMs: number;
    exponentialBackoff: boolean;
    fallbackProviders: string[];
}

export interface RetryPolicy {
    maxAttempts: number;
    baseDelayMs: number;
    maxDelayMs: number;
    backoffMultiplier: number;
    retryableErrors: string[];
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    retryableErrors: [
        'timeout',
        'network',
        'ECONNREFUSED',
        'ETIMEDOUT',
        'ENOTFOUND',
        'rate_limit',
        '503',
        '502',
        '504',
    ],
};

export async function executeWithFallback<T>(
    request: ChatRequest,
    executeFn: (provider: ProviderConfig, model: ModelConfig) => Promise<T>,
    fallbackConfig: FallbackConfig,
    retryPolicy: RetryPolicy = DEFAULT_RETRY_POLICY
): Promise<T> {
    const providers = await getProvidersForModel(request.model);
    
    if (providers.length === 0) {
        throw new Error(`No providers available for model: ${request.model}`);
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= fallbackConfig.maxRetries; attempt++) {
        const provider = selectHealthiestProvider(providers);
        
        if (!provider) {
            throw new Error('No healthy providers available');
        }

        try {
            const model = await getModelForProvider(provider.id, request.model);
            if (!model) {
                throw new Error(`Model not available on provider: ${provider.name}`);
            }

            return await executeFn(provider, model);
        } catch (error) {
            lastError = error as Error;
            
            if (!isRetryableError(error as Error, retryPolicy)) {
                throw error;
            }

            if (attempt < fallbackConfig.maxRetries) {
                const delay = calculateBackoff(attempt, retryPolicy);
                await sleep(delay);
            }
        }
    }

    throw lastError || new Error('All fallback attempts failed');
}

async function getModelForProvider(providerId: string, modelId: string): Promise<ModelConfig | null> {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data, error } = await supabase
        .from('ai_models')
        .select('*')
        .eq('provider_id', providerId)
        .eq('model_id', modelId)
        .eq('status', 'active')
        .maybeSingle();

    if (error || !data) return null;
    return {
        id: data.id,
        providerId: data.provider_id,
        modelId: data.model_id,
        displayName: data.display_name,
        capabilities: data.capabilities || [],
        contextLength: data.context_length,
        maxOutputTokens: data.max_output_tokens,
        inputCostPer1kTokens: data.input_cost_per_1k_tokens,
        outputCostPer1kTokens: data.output_cost_per_1k_tokens,
        status: data.status,
        priority: data.priority,
        healthStatus: data.health_status,
        lastHealthCheck: data.last_health_check,
        config: data.config || {},
    };
}

function isRetryableError(error: Error, policy: RetryPolicy): boolean {
    const errorMessage = error.message.toLowerCase();
    return policy.retryableErrors.some(e => errorMessage.includes(e.toLowerCase()));
}

function calculateBackoff(attempt: number, policy: RetryPolicy): number {
    if (!policy.exponentialBackoff) {
        return policy.baseDelayMs;
    }
    
    const delay = Math.min(
        policy.baseDelayMs * Math.pow(policy.backoffMultiplier, attempt),
        policy.maxDelayMs
    );
    
    return delay + Math.random() * 1000;
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function createCircuitBreaker(
    failureThreshold: number = 5,
    resetTimeoutMs: number = 60000
): {
    recordSuccess: () => void;
    recordFailure: () => void;
    isOpen: () => boolean;
} {
    let failures = 0;
    let lastFailureTime = 0;
    let isOpen = false;

    return {
        recordSuccess() {
            failures = 0;
            isOpen = false;
        },
        recordFailure() {
            failures++;
            lastFailureTime = Date.now();
            if (failures >= failureThreshold) {
                isOpen = true;
            }
        },
        isOpen() {
            if (isOpen && Date.now() - lastFailureTime > resetTimeoutMs) {
                isOpen = false;
                failures = 0;
            }
            return isOpen;
        },
    };
}

export class ProviderCircuitBreakers {
    private breakers: Map<string, ReturnType<typeof createCircuitBreaker>> = new Map();

    getBreaker(providerId: string) {
        if (!this.breakers.has(providerId)) {
            this.breakers.set(providerId, createCircuitBreaker());
        }
        return this.breakers.get(providerId)!;
    }

    recordSuccess(providerId: string) {
        this.getBreaker(providerId).recordSuccess();
    }

    recordFailure(providerId: string) {
        this.getBreaker(providerId).recordFailure();
    }

    isAvailable(providerId: string): boolean {
        return !this.getBreaker(providerId).isOpen();
    }
}

export const circuitBreakers = new ProviderCircuitBreakers();
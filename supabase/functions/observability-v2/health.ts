import { createClient } from '@supabase/supabase-js';
import type { HealthCheckResult, ObservabilityConfig } from './types.ts';

const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

function getObservabilityConfig(): ObservabilityConfig {
    return {
        enabled: Deno.env.get('OBSERVABILITY_ENABLED') === 'true',
        serviceName: Deno.env.get('OBSERVABILITY_SERVICE_NAME') || 'visionary-ai',
        sampleRate: parseFloat(Deno.env.get('OBSERVABILITY_SAMPLE_RATE') || '1.0'),
        exportIntervalMs: parseInt(Deno.env.get('OBSERVABILITY_EXPORT_INTERVAL_MS') || '30000', 10),
    };
}

export interface HealthChecker {
    name: string;
    check(): Promise<HealthCheckResult>;
}

export class HealthCheckRegistry {
    private static instance: HealthCheckRegistry;
    private checkers: Map<string, HealthChecker> = new Map();

    private constructor() {}

    static getInstance(): HealthCheckRegistry {
        if (!HealthCheckRegistry.instance) {
            HealthCheckRegistry.instance = new HealthCheckRegistry();
        }
        return HealthCheckRegistry.instance;
    }

    register(checker: HealthChecker): void {
        this.checkers.set(checker.name, checker);
    }

    unregister(name: string): boolean {
        return this.checkers.delete(name);
    }

    async runAll(): Promise<HealthCheckResult[]> {
        const results = await Promise.all(
            Array.from(this.checkers.values()).map(async checker => {
                try {
                    return await checker.check();
                } catch (error) {
                    return {
                        service: checker.name,
                        status: 'unhealthy',
                        error: (error as Error).message,
                        timestamp: Date.now(),
                    };
                }
            })
        );
        return results;
    }

    async runOne(name: string): Promise<HealthCheckResult | null> {
        const checker = this.checkers.get(name);
        if (!checker) return null;
        try {
            return await checker.check();
        } catch (error) {
            return {
                service: name,
                status: 'unhealthy',
                error: (error as Error).message,
                timestamp: Date.now(),
            };
        }
    }

    getRegisteredChecks(): string[] {
        return Array.from(this.checkers.keys());
    }
}

export const healthCheckRegistry = HealthCheckRegistry.getInstance();

export async function checkDatabaseHealth(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
        const { error } = await supabase.from('profiles').select('id').limit(1);
        if (error) throw error;
        return {
            service: 'database',
            status: 'healthy',
            latencyMs: Date.now() - start,
            timestamp: Date.now(),
        };
    } catch (error) {
        return {
            service: 'database',
            status: 'unhealthy',
            latencyMs: Date.now() - start,
            error: (error as Error).message,
            timestamp: Date.now(),
        };
    }
}

export async function checkSupabaseAuthHealth(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
        const { error } = await supabase.auth.admin.listUsers({ perPage: 1 });
        if (error) throw error;
        return {
            service: 'supabase-auth',
            status: 'healthy',
            latencyMs: Date.now() - start,
            timestamp: Date.now(),
        };
    } catch (error) {
        return {
            service: 'supabase-auth',
            status: 'unhealthy',
            latencyMs: Date.now() - start,
            error: (error as Error).message,
            timestamp: Date.now(),
        };
    }
}

export async function checkSupabaseStorageHealth(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
        const { error } = await supabase.storage.listBuckets();
        if (error) throw error;
        return {
            service: 'supabase-storage',
            status: 'healthy',
            latencyMs: Date.now() - start,
            timestamp: Date.now(),
        };
    } catch (error) {
        return {
            service: 'supabase-storage',
            status: 'unhealthy',
            latencyMs: Date.now() - start,
            error: (error as Error).message,
            timestamp: Date.now(),
        };
    }
}

export async function checkSupabaseRealtimeHealth(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
        const channel = supabase.channel('health-check');
        const { error } = await channel.subscribe();
        if (error) throw error;
        await channel.unsubscribe();
        return {
            service: 'supabase-realtime',
            status: 'healthy',
            latencyMs: Date.now() - start,
            timestamp: Date.now(),
        };
    } catch (error) {
        return {
            service: 'supabase-realtime',
            status: 'unhealthy',
            latencyMs: Date.now() - start,
            error: (error as Error).message,
            timestamp: Date.now(),
        };
    }
}

export async function checkExternalService(url: string, name: string): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
            method: 'GET',
            signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
            return {
                service: name,
                status: 'healthy',
                latencyMs: Date.now() - start,
                timestamp: Date.now(),
            };
        } else {
            return {
                service: name,
                status: 'degraded',
                latencyMs: Date.now() - start,
                error: `HTTP ${response.status}`,
                timestamp: Date.now(),
            };
        }
    } catch (error) {
        return {
            service: name,
            status: 'unhealthy',
            latencyMs: Date.now() - start,
            error: (error as Error).message,
            timestamp: Date.now(),
        };
    }
}

export function createCompositeHealthCheck(checkers: HealthChecker[]): HealthChecker {
    return {
        name: 'composite',
        async check(): Promise<HealthCheckResult> {
            const results = await Promise.all(checkers.map(c => c.check()));
            const unhealthy = results.filter(r => r.status === 'unhealthy');
            const degraded = results.filter(r => r.status === 'degraded');
            
            let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
            if (unhealthy.length > 0) status = 'unhealthy';
            else if (degraded.length > 0) status = 'degraded';
            
            return {
                service: 'composite',
                status,
                details: { checks: results },
                timestamp: Date.now(),
            };
        },
    };
}

export function registerDefaultHealthChecks(): void {
    healthCheckRegistry.register({
        name: 'database',
        check: checkDatabaseHealth,
    });

    healthCheckRegistry.register({
        name: 'supabase-auth',
        check: checkSupabaseAuthHealth,
    });

    healthCheckRegistry.register({
        name: 'supabase-storage',
        check: checkSupabaseStorageHealth,
    });

    healthCheckRegistry.register({
        name: 'supabase-realtime',
        check: checkSupabaseRealtimeHealth,
    });
}

export async function getOverallHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: HealthCheckResult[];
    timestamp: number;
}> {
    const results = await healthCheckRegistry.runAll();
    
    const unhealthy = results.filter(r => r.status === 'unhealthy');
    const degraded = results.filter(r => r.status === 'degraded');
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (unhealthy.length > 0) status = 'unhealthy';
    else if (degraded.length > 0) status = 'degraded';
    
    return {
        status,
        checks: results,
        timestamp: Date.now(),
    };
}
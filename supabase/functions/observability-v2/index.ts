export * from './types.ts';
export * from './logger.ts';
export * from './metrics.ts';
export * from './tracing.ts';
export * from './health.ts';

import { getObservabilityConfig } from './logger.ts';

export function isObservabilityV2Enabled(): boolean {
    return getObservabilityConfig().enabled;
}

export async function initializeObservabilityV2(): Promise<void> {
    const config = getObservabilityConfig();
    
    if (!config.enabled) {
        console.log('Observability v2 is disabled (OBSERVABILITY_ENABLED=false)');
        return;
    }

    console.log('Initializing Observability v2...');
    
    const { registerDefaultHealthChecks } = await import('./health.ts');
    registerDefaultHealthChecks();
    
    console.log('Observability v2 initialized');
}
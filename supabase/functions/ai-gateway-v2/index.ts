export * from './types.ts';
export * from './providers.ts';
export * from './models.ts';
export * from './health.ts';
export * from './fallback.ts';
export * from './quotas.ts';
export * from './usage.ts';

import { getAiGatewayConfig } from './providers.ts';

export function isAiGatewayV2Enabled(): boolean {
    return getAiGatewayConfig().enabled;
}

export async function initializeAiGatewayV2(): Promise<void> {
    const config = getAiGatewayConfig();
    
    if (!config.enabled) {
        console.log('AI Gateway v2 is disabled (NEW_AI_GATEWAY_ENABLED=false)');
        return;
    }

    console.log('Initializing AI Gateway v2...');
    console.log('AI Gateway v2 initialized');
}
export * from './types.ts';
export * from './create.ts';
export * from './revoke.ts';
export * from './rotate.ts';
export * from './verify.ts';

import { getApiKeyConfig } from './create.ts';

export function isApiKeysV2Enabled(): boolean {
    return getApiKeyConfig().enabled;
}

export async function initializeApiKeysV2(): Promise<void> {
    const config = getApiKeyConfig();
    
    if (!config.enabled) {
        console.log('API Keys v2 system is disabled (NEW_API_KEYS_ENABLED=false)');
        return;
    }

    console.log('Initializing API Keys v2 system...');
    console.log('API Keys v2 system initialized');
}
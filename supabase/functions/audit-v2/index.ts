export * from './types.ts';
export * from './logger.ts';

import { getAuditConfig } from './logger.ts';

export function isAuditV2Enabled(): boolean {
    return getAuditConfig().enabled;
}

export async function initializeAuditV2(): Promise<void> {
    const config = getAuditConfig();
    
    if (!config.enabled) {
        console.log('Audit v2 system is disabled (NEW_AUDIT_ENABLED=false)');
        return;
    }

    console.log('Initializing Audit v2 system...');
    console.log('Audit v2 system initialized');
}
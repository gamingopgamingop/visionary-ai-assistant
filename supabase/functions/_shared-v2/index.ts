export * from './env.ts';
export * from './errors.ts';
export * from './response.ts';
export * from './validation.ts';
export * from './crypto.ts';
export * from './logger.ts';
export * from './request-id.ts';
export * from './rate-limit.ts';
export * from './types.ts';
export * from './database.ts';

import { FeatureFlags } from './env.ts';

export function isFeatureEnabled(flag: keyof typeof FeatureFlags): boolean {
    return FeatureFlags[flag];
}

export function getAllFeatureFlags(): Record<string, boolean> {
    return { ...FeatureFlags };
}

export async function initializeSharedV2(): Promise<void> {
    console.log('Initializing shared-v2 library...');
    console.log('Feature flags:', getAllFeatureFlags());
    console.log('Shared-v2 library initialized');
}
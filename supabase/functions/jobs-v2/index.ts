export * from './types.ts';
export * from './queue.ts';
export * from './worker.ts';
export * from './scheduler.ts';

import { getJobsConfig } from './queue.ts';

export function isJobsV2Enabled(): boolean {
    return getJobsConfig().enabled;
}

export async function initializeJobsV2(): Promise<void> {
    const config = getJobsConfig();
    
    if (!config.enabled) {
        console.log('Jobs v2 system is disabled (JOBS_V2_ENABLED=false)');
        return;
    }

    console.log('Initializing Jobs v2...');
    
    const { initializeDefaultSchedules } = await import('./scheduler.ts');
    await initializeDefaultSchedules();
    
    console.log('Jobs v2 initialized');
}
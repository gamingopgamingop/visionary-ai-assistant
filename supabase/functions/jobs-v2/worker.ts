import type { JobsConfig, BackgroundJob, JobHandler } from './types.ts';
import { 
    getJobsConfig, 
    getPendingJobs, 
    updateJobStatus, 
    getStuckJobs,
    requeueStuckJobs 
} from './queue.ts';

const workerHandlers = new Map<string, JobHandler>();

export function registerJobHandler(handler: JobHandler): void {
    workerHandlers.set(handler.jobType, handler);
}

export function unregisterJobHandler(jobType: string): boolean {
    return workerHandlers.delete(jobType);
}

export function getJobHandler(jobType: string): JobHandler | undefined {
    return workerHandlers.get(jobType);
}

export function getRegisteredJobTypes(): string[] {
    return Array.from(workerHandlers.keys());
}

export async function executeJob(job: BackgroundJob): Promise<Record<string, unknown>> {
    const handler = workerHandlers.get(job.jobType);
    
    if (!handler) {
        throw new Error(`No handler registered for job type: ${job.jobType}`);
    }

    return await handler.handle(job);
}

export async function processJob(job: BackgroundJob): Promise<void> {
    await updateJobStatus(job.id, 'running');

    try {
        const result = await executeJob(job);
        await updateJobStatus(job.id, 'completed', { result });
    } catch (error) {
        const err = error as Error;
        
        if (job.attempts + 1 >= job.maxAttempts) {
            await updateJobStatus(job.id, 'failed', { error: err.message });
        } else {
            const config = getJobsConfig();
            const retryDelay = config.defaultRetryDelayMs * Math.pow(2, job.attempts);
            const nextRetryAt = new Date(Date.now() + retryDelay).toISOString();
            
            await updateJobStatus(job.id, 'retrying', {
                error: err.message,
                nextRetryAt,
            });
        }
    }
}

export async function runWorker(
    maxConcurrent: number = 5,
    pollIntervalMs: number = 5000
): Promise<void> {
    const config = getJobsConfig();
    const activeJobs = new Set<string>();
    let isShuttingDown = false;

    const shutdown = () => {
        isShuttingDown = true;
    };

    if (typeof Deno !== 'undefined') {
        Deno.addSignalListener('SIGTERM', shutdown);
        Deno.addSignalListener('SIGINT', shutdown);
    }

    while (!isShuttingDown) {
        try {
            if (activeJobs.size < maxConcurrent) {
                const availableSlots = maxConcurrent - activeJobs.size;
                const jobs = await getPendingJobs(availableSlots);

                for (const job of jobs) {
                    if (isShuttingDown) break;
                    
                    if (activeJobs.has(job.id)) continue;
                    
                    activeJobs.add(job.id);
                    
                    processJob(job).finally(() => {
                        activeJobs.delete(job.id);
                    });
                }
            }

            await requeueStuckJobs();
        } catch (error) {
            console.error('Worker error:', error);
        }

        await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }

    while (activeJobs.size > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('Worker shut down gracefully');
}

export function createWorker(
    options: {
        maxConcurrent?: number;
        pollIntervalMs?: number;
        jobTypes?: string[];
    } = {}
): {
    start: () => Promise<void>;
    stop: () => void;
} {
    let isRunning = false;
    let pollInterval: number | null = null;

    const config = getJobsConfig();
    const maxConcurrent = options.maxConcurrent ?? config.maxConcurrentJobs;
    const pollIntervalMs = options.pollIntervalMs ?? config.pollIntervalMs;
    const allowedJobTypes = new Set(options.jobTypes || []);

    async function poll(): Promise<void> {
        if (!isRunning) return;

        try {
            const jobs = await getPendingJobs(maxConcurrent);

            for (const job of jobs) {
                if (!isRunning) break;
                
                if (allowedJobTypes.size > 0 && !allowedJobTypes.has(job.jobType)) {
                    continue;
                }

                processJob(job).catch(console.error);
            }
        } catch (error) {
            console.error('Worker poll error:', error);
        }
    }

    return {
        async start(): Promise<void> {
            if (isRunning) return;
            isRunning = true;
            console.log('Worker started');

            while (isRunning) {
                await poll();
                await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
            }
        },

        stop(): void {
            isRunning = false;
            if (pollInterval) {
                clearInterval(pollInterval);
                pollInterval = null;
            }
            console.log('Worker stopped');
        },
    };
}

export function createScheduledWorker(
    jobType: string,
    cronExpression: string,
    payload: Record<string, unknown>,
    options: {
        userId?: string;
        priority?: number;
        maxAttempts?: number;
    } = {}
): {
    start: () => void;
    stop: () => void;
} {
    let interval: number | null = null;
    let isRunning = false;

    function parseCron(expression: string): number {
        const parts = expression.split(' ');
        if (parts.length !== 5) {
            throw new Error('Invalid cron expression (must be 5 parts)');
        }
        return 60000;
    }

    return {
        start(): void {
            if (isRunning) return;
            isRunning = true;
            
            const intervalMs = parseCron(cronExpression);
            
            interval = setInterval(async () => {
                try {
                    const { enqueueJob } = await import('./queue.ts');
                    await enqueueJob({
                        userId: options.userId,
                        jobType: jobType as any,
                        payload,
                        priority: options.priority,
                        maxAttempts: options.maxAttempts,
                    });
                } catch (error) {
                    console.error('Scheduled job enqueue failed:', error);
                }
            }, intervalMs);

            console.log(`Scheduled worker for ${jobType} started`);
        },

        stop(): void {
            if (interval) {
                clearInterval(interval);
                interval = null;
            }
            isRunning = false;
            console.log(`Scheduled worker for ${jobType} stopped`);
        },
    };
}
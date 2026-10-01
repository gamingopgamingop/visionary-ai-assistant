import type { JobsConfig, BackgroundJob, JobType } from './types.ts';
import { 
    getJobsConfig, 
    enqueueJob, 
    getJobs 
} from './queue.ts';

const scheduledJobs = new Map<string, number>();

export interface ScheduledJob {
    id: string;
    name: string;
    cronExpression: string;
    jobType: JobType;
    payload: Record<string, unknown>;
    userId?: string;
    priority?: number;
    maxAttempts?: number;
    enabled: boolean;
    nextRun?: string;
    lastRun?: string;
}

export async function scheduleJob(
    name: string,
    cronExpression: string,
    jobType: JobType,
    payload: Record<string, unknown>,
    options: {
        userId?: string;
        priority?: number;
        maxAttempts?: number;
    } = {}
): Promise<ScheduledJob> {
    const job: ScheduledJob = {
        id: crypto.randomUUID(),
        name,
        cronExpression,
        jobType,
        payload,
        userId: options.userId,
        priority: options.priority,
        maxAttempts: options.maxAttempts,
        enabled: true,
    };

    const intervalMs = parseCronToMs(cronExpression);
    
    const intervalId = setInterval(async () => {
        try {
            await enqueueJob({
                userId: job.userId,
                jobType: job.jobType,
                payload: job.payload,
                priority: job.priority,
                maxAttempts: job.maxAttempts,
            });
            
            job.lastRun = new Date().toISOString();
            job.nextRun = new Date(Date.now() + intervalMs).toISOString();
        } catch (error) {
            console.error(`Scheduled job ${name} failed:`, error);
        }
    }, intervalMs);

    scheduledJobs.set(job.id, intervalId);

    job.nextRun = new Date(Date.now() + intervalMs).toISOString();

    return job;
}

export function unscheduleJob(scheduleId: string): boolean {
    const intervalId = scheduledJobs.get(scheduleId);
    if (intervalId) {
        clearInterval(intervalId);
        scheduledJobs.delete(scheduleId);
        return true;
    }
    return false;
}

export function getScheduledJobs(): ScheduledJob[] {
    return Array.from(scheduledJobs.entries()).map(([id, intervalId]) => ({
        id,
        name: '',
        cronExpression: '',
        jobType: 'cleanup' as JobType,
        payload: {},
        enabled: true,
    }));
}

export function pauseScheduledJob(scheduleId: string): boolean {
    const intervalId = scheduledJobs.get(scheduleId);
    if (intervalId) {
        clearInterval(intervalId);
        scheduledJobs.delete(scheduleId);
        return true;
    }
    return false;
}

export function resumeScheduledJob(
    scheduleId: string,
    cronExpression: string,
    jobType: JobType,
    payload: Record<string, unknown>,
    options: {
        userId?: string;
        priority?: number;
        maxAttempts?: number;
    } = {}
): ScheduledJob {
    pauseScheduledJob(scheduleId);
    return scheduleJob(scheduleId, cronExpression, jobType, payload, options);
}

export function clearAllScheduledJobs(): void {
    for (const intervalId of scheduledJobs.values()) {
        clearInterval(intervalId);
    }
    scheduledJobs.clear();
}

export async function scheduleRecurringCleanup(): Promise<ScheduledJob> {
    return scheduleJob(
        'cleanup-old-jobs',
        '0 2 * * *',
        'cleanup',
        { olderThanDays: 30 },
        { priority: -10 }
    );
}

export async function scheduleRecurringStuckJobRequeue(): Promise<ScheduledJob> {
    return scheduleJob(
        'requeue-stuck-jobs',
        '*/5 * * * *',
        'cleanup',
        { action: 'requeue_stuck', timeoutMs: 300000 },
        { priority: 10 }
    );
}

export async function scheduleRecurringQuotaReset(): Promise<ScheduledJob> {
    return scheduleJob(
        'reset-daily-quotas',
        '0 0 * * *',
        'analytics',
        { action: 'reset_daily_quotas' },
        { priority: 0 }
    );
}

export async function scheduleRecurringUsageAggregation(): Promise<ScheduledJob> {
    return scheduleJob(
        'aggregate-hourly-usage',
        '0 * * * *',
        'analytics',
        { action: 'aggregate_hourly_usage' },
        { priority: 5 }
    );
}

export function parseCronToMs(expression: string): number {
    const parts = expression.split(' ');
    if (parts.length !== 5) {
        throw new Error('Invalid cron expression (must be 5 parts: minute hour day month weekday)');
    }

    const [minute, hour, day, month, weekday] = parts;
    const now = new Date();
    const nextRun = new Date(now);

    if (minute !== '*') {
        nextRun.setMinutes(parseInt(minute, 10));
    }
    if (hour !== '*') {
        nextRun.setHours(parseInt(hour, 10));
    }
    if (day !== '*') {
        nextRun.setDate(parseInt(day, 10));
    }
    if (month !== '*') {
        nextRun.setMonth(parseInt(month, 10) - 1);
    }

    if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1);
    }

    return Math.max(60000, nextRun.getTime() - now.getTime());
}

export async function initializeDefaultSchedules(): Promise<void> {
    const config = getJobsConfig();
    
    if (!config.enabled) return;

    await scheduleRecurringCleanup();
    await scheduleRecurringStuckJobRequeue();
    
    console.log('Default schedules initialized');
}

export function getSchedulerStats(): {
    scheduledCount: number;
    runningIntervals: number;
} {
    return {
        scheduledCount: scheduledJobs.size,
        runningIntervals: scheduledJobs.size,
    };
}
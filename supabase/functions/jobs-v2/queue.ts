import { createClient } from '@supabase/supabase-js';
import type { JobsConfig, BackgroundJob, CreateJobRequest, QueueStats, JobType, JobStatus } from './types.ts';

const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

function getJobsConfig(): JobsConfig {
    return {
        enabled: Deno.env.get('JOBS_V2_ENABLED') === 'true',
        maxConcurrentJobs: parseInt(Deno.env.get('JOBS_MAX_CONCURRENT') || '10', 10),
        pollIntervalMs: parseInt(Deno.env.get('JOBS_POLL_INTERVAL_MS') || '5000', 10),
        defaultMaxAttempts: parseInt(Deno.env.get('JOBS_DEFAULT_MAX_ATTEMPTS') || '3', 10),
        defaultRetryDelayMs: parseInt(Deno.env.get('JOBS_DEFAULT_RETRY_DELAY_MS') || '60000', 10),
    };
}

export async function enqueueJob(request: CreateJobRequest): Promise<BackgroundJob> {
    const config = getJobsConfig();
    
    if (!config.enabled) {
        throw new Error('Jobs system is disabled');
    }

    const job: BackgroundJob = {
        id: crypto.randomUUID(),
        userId: request.userId,
        jobType: request.jobType,
        status: 'pending',
        payload: request.payload,
        attempts: 0,
        maxAttempts: request.maxAttempts ?? config.defaultMaxAttempts,
        priority: request.priority ?? 0,
        scheduledAt: request.scheduledAt || new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    const { error } = await supabase.from('background_jobs').insert({
        id: job.id,
        user_id: job.userId,
        job_type: job.jobType,
        status: job.status,
        payload: job.payload,
        attempts: job.attempts,
        max_attempts: job.maxAttempts,
        priority: job.priority,
        scheduled_at: job.scheduledAt,
        created_at: job.createdAt,
        updated_at: job.updatedAt,
    });

    if (error) {
        throw new Error(`Failed to enqueue job: ${error.message}`);
    }

    return job;
}

export async function enqueueBulkJobs(requests: CreateJobRequest[]): Promise<BackgroundJob[]> {
    if (requests.length === 0) return [];

    const config = getJobsConfig();
    const now = new Date().toISOString();

    const jobs = requests.map(request => ({
        id: crypto.randomUUID(),
        user_id: request.userId,
        job_type: request.jobType,
        status: 'pending',
        payload: request.payload,
        attempts: 0,
        max_attempts: request.maxAttempts ?? config.defaultMaxAttempts,
        priority: request.priority ?? 0,
        scheduled_at: request.scheduledAt || now,
        created_at: now,
        updated_at: now,
    }));

    const { data, error } = await supabase.from('background_jobs').insert(jobs).select();

    if (error) {
        throw new Error(`Failed to enqueue bulk jobs: ${error.message}`);
    }

    return (data || []).map(mapRowToJob);
}

export async function getJob(jobId: string): Promise<BackgroundJob | null> {
    const { data, error } = await supabase
        .from('background_jobs')
        .select('*')
        .eq('id', jobId)
        .maybeSingle();

    if (error || !data) return null;
    return mapRowToJob(data);
}

export async function getJobs(filters?: {
    userId?: string;
    jobType?: JobType;
    status?: JobStatus;
    limit?: number;
    offset?: number;
}): Promise<BackgroundJob[]> {
    let query = supabase
        .from('background_jobs')
        .select('*')
        .order('priority', { ascending: false })
        .order('scheduled_at', { ascending: true });

    if (filters?.userId) {
        query = query.eq('user_id', filters.userId);
    }
    if (filters?.jobType) {
        query = query.eq('job_type', filters.jobType);
    }
    if (filters?.status) {
        query = query.eq('status', filters.status);
    }
    if (filters?.limit) {
        query = query.limit(filters.limit);
    }
    if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 100) - 1);
    }

    const { data, error } = await query;

    if (error) throw new Error(`Failed to get jobs: ${error.message}`);

    return (data || []).map(mapRowToJob);
}

export async function updateJobStatus(
    jobId: string,
    status: JobStatus,
    updates: {
        result?: Record<string, unknown>;
        error?: string;
        startedAt?: string;
        completedAt?: string;
        nextRetryAt?: string;
    } = {}
): Promise<void> {
    const updateData: Record<string, unknown> = {
        status,
        updated_at: new Date().toISOString(),
        ...updates,
    };

    if (status === 'running' && !updates.startedAt) {
        updateData.started_at = new Date().toISOString();
    }
    if (status === 'completed' || status === 'failed') {
        updateData.completed_at = new Date().toISOString();
    }

    const { error } = await supabase
        .from('background_jobs')
        .update(updateData)
        .eq('id', jobId);

    if (error) throw new Error(`Failed to update job status: ${error.message}`);
}

export async function incrementAttempts(jobId: string): Promise<void> {
    const { data, error } = await supabase
        .from('background_jobs')
        .update({ 
            attempts: supabase.rpc('increment', { x: 1 }),
            updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);

    if (error) throw new Error(`Failed to increment attempts: ${error.message}`);
}

export async function cancelJob(jobId: string): Promise<boolean> {
    const { data, error } = await supabase
        .from('background_jobs')
        .update({ 
            status: 'cancelled',
            updated_at: new Date().toISOString(),
        })
        .eq('id', jobId)
        .in('status', ['pending', 'retrying'])
        .select('id')
        .maybeSingle();

    if (error) throw new Error(`Failed to cancel job: ${error.message}`);
    return !!data;
}

export async function retryJob(jobId: string): Promise<void> {
    const { error } = await supabase
        .from('background_jobs')
        .update({ 
            status: 'retrying',
            attempts: 0,
            error: null,
            next_retry_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);

    if (error) throw new Error(`Failed to retry job: ${error.message}`);
}

export async function getQueueStats(): Promise<QueueStats> {
    const { data, error } = await supabase
        .from('background_jobs')
        .select('status');

    if (error) throw new Error(`Failed to get queue stats: ${error.message}`);

    const stats: QueueStats = {
        pending: 0,
        running: 0,
        completed: 0,
        failed: 0,
        total: 0,
    };

    for (const row of data || []) {
        stats.total++;
        switch (row.status) {
            case 'pending':
                stats.pending++;
                break;
            case 'running':
            case 'retrying':
                stats.running++;
                break;
            case 'completed':
                stats.completed++;
                break;
            case 'failed':
            case 'cancelled':
                stats.failed++;
                break;
        }
    }

    return stats;
}

export async function getJobsByType(jobType: JobType): Promise<BackgroundJob[]> {
    return getJobs({ jobType });
}

export async function getPendingJobs(limit: number = 100): Promise<BackgroundJob[]> {
    return getJobs({ status: 'pending', limit });
}

export async function getStuckJobs(timeoutMs: number = 300000): Promise<BackgroundJob[]> {
    const cutoff = new Date(Date.now() - timeoutMs).toISOString();
    
    const { data, error } = await supabase
        .from('background_jobs')
        .select('*')
        .in('status', ['running', 'retrying'])
        .lt('started_at', cutoff)
        .order('started_at', { ascending: true });

    if (error) throw new Error(`Failed to get stuck jobs: ${error.message}`);

    return (data || []).map(mapRowToJob);
}

export async function requeueStuckJobs(timeoutMs: number = 300000): Promise<number> {
    const stuckJobs = await getStuckJobs(timeoutMs);
    
    for (const job of stuckJobs) {
        await updateJobStatus(job.id, 'retrying', {
            attempts: Math.min(job.attempts, job.maxAttempts - 1),
            nextRetryAt: new Date().toISOString(),
        });
    }

    return stuckJobs.length;
}

export async function cleanupOldJobs(olderThanDays: number = 30): Promise<number> {
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
        .from('background_jobs')
        .delete()
        .in('status', ['completed', 'failed', 'cancelled'])
        .lt('created_at', cutoff)
        .select('id');

    if (error) throw new Error(`Failed to cleanup old jobs: ${error.message}`);

    return data?.length || 0;
}

function mapRowToJob(row: any): BackgroundJob {
    return {
        id: row.id,
        userId: row.user_id,
        jobType: row.job_type,
        status: row.status,
        payload: row.payload || {},
        result: row.result,
        error: row.error,
        attempts: row.attempts || 0,
        maxAttempts: row.max_attempts || 3,
        priority: row.priority || 0,
        scheduledAt: row.scheduled_at,
        startedAt: row.started_at,
        completedAt: row.completed_at,
        nextRetryAt: row.next_retry_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}
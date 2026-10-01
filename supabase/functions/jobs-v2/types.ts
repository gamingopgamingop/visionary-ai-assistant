export type JobType =
    | 'connector_sync'
    | 'webhook_process'
    | 'token_refresh'
    | 'ai_background_task'
    | 'document_processing'
    | 'indexing'
    | 'analytics'
    | 'cleanup';

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'retrying';

export interface JobsConfig {
    enabled: boolean;
    maxConcurrentJobs: number;
    pollIntervalMs: number;
    defaultMaxAttempts: number;
    defaultRetryDelayMs: number;
}

export interface BackgroundJob {
    id: string;
    userId?: string;
    jobType: JobType;
    status: JobStatus;
    payload: Record<string, unknown>;
    result?: Record<string, unknown>;
    error?: string;
    attempts: number;
    maxAttempts: number;
    priority: number;
    scheduledAt: string;
    startedAt?: string;
    completedAt?: string;
    nextRetryAt?: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateJobRequest {
    userId?: string;
    jobType: JobType;
    payload: Record<string, unknown>;
    priority?: number;
    scheduledAt?: string;
    maxAttempts?: number;
}

export interface JobHandler {
    jobType: JobType;
    handle(job: BackgroundJob): Promise<Record<string, unknown>>;
}

export interface QueueStats {
    pending: number;
    running: number;
    completed: number;
    failed: number;
    total: number;
}
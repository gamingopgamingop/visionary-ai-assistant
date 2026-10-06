import { apiClient } from '../../shared/services/apiClient';
import { ApiResponse, PaginationParams } from '../../shared/types';

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

export interface QueueStats {
  pending: number;
  running: number;
  completed: number;
  failed: number;
  total: number;
}

export class JobsServiceV2 {
  async listJobs(filters?: {
    status?: JobStatus;
    jobType?: JobType;
    limit?: number;
    offset?: number;
  } & PaginationParams): Promise<ApiResponse<BackgroundJob[]>> {
    return apiClient.get<BackgroundJob[]>('/jobs', filters);
  }

  async getJob(jobId: string): Promise<ApiResponse<BackgroundJob>> {
    return apiClient.get<BackgroundJob>(`/jobs/${jobId}`);
  }

  async getQueueStats(): Promise<ApiResponse<QueueStats>> {
    return apiClient.get<QueueStats>('/jobs/stats');
  }

  async retryJob(jobId: string): Promise<ApiResponse<void>> {
    return apiClient.post<void>(`/jobs/${jobId}/retry`);
  }

  async cancelJob(jobId: string): Promise<ApiResponse<void>> {
    return apiClient.post<void>(`/jobs/${jobId}/cancel`);
  }

  async enqueueJob(request: {
    jobType: JobType;
    payload: Record<string, unknown>;
    priority?: number;
  }): Promise<ApiResponse<BackgroundJob>> {
    return apiClient.post<BackgroundJob>('/jobs', request);
  }
}

export const jobsServiceV2 = new JobsServiceV2();

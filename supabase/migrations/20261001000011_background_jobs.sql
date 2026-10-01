-- Migration: 011_background_jobs.sql
-- Creates the background jobs table

CREATE TABLE IF NOT EXISTS public.background_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    job_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled', 'retrying')),
    payload JSONB NOT NULL DEFAULT '{}',
    result JSONB,
    error TEXT,
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    priority INTEGER NOT NULL DEFAULT 0,
    scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    next_retry_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_background_jobs_status ON public.background_jobs(status);
CREATE INDEX IF NOT EXISTS idx_background_jobs_job_type ON public.background_jobs(job_type);
CREATE INDEX IF NOT EXISTS idx_background_jobs_user_id ON public.background_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_background_jobs_scheduled_at ON public.background_jobs(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_background_jobs_priority_scheduled 
    ON public.background_jobs(priority DESC, scheduled_at ASC);

COMMENT ON TABLE public.background_jobs IS 'Background job queue for async processing';
COMMENT ON COLUMN public.background_jobs.job_type IS 'Type of job (connector_sync, webhook_process, token_refresh, etc.)';
COMMENT ON COLUMN public.background_jobs.payload IS 'Job input data';
COMMENT ON COLUMN public.background_jobs.result IS 'Job output data';
COMMENT ON COLUMN public.background_jobs.attempts IS 'Number of attempts made';
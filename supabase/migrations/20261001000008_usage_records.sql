-- Migration: 008_usage_records.sql
-- Creates the usage records table

CREATE TABLE IF NOT EXISTS public.usage_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    resource_type TEXT NOT NULL CHECK (resource_type IN ('ai_requests', 'ai_tokens', 'ai_images', 'connector_calls', 'api_calls', 'storage', 'background_jobs')),
    resource_id UUID,
    quantity BIGINT NOT NULL DEFAULT 1,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usage_records_user_id ON public.usage_records(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_records_resource_type ON public.usage_records(resource_type);
CREATE INDEX IF NOT EXISTS idx_usage_records_resource_id ON public.usage_records(resource_id);
CREATE INDEX IF NOT EXISTS idx_usage_records_created_at ON public.usage_records(created_at);
CREATE INDEX IF NOT EXISTS idx_usage_records_user_resource_created 
    ON public.usage_records(user_id, resource_type, created_at);

COMMENT ON TABLE public.usage_records IS 'Usage tracking for quota enforcement';
COMMENT ON COLUMN public.usage_records.resource_type IS 'Type of resource being consumed';
COMMENT ON COLUMN public.usage_records.quantity IS 'Number of units consumed';
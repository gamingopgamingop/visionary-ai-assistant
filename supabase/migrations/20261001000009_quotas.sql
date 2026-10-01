-- Migration: 009_quotas.sql
-- Creates the quotas table

CREATE TABLE IF NOT EXISTS public.quotas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_type TEXT NOT NULL DEFAULT 'free' CHECK (plan_type IN ('free', 'pro', 'business', 'enterprise')),
    resource_type TEXT NOT NULL CHECK (resource_type IN ('ai_requests', 'ai_tokens', 'ai_images', 'connector_calls', 'api_calls', 'storage', 'background_jobs')),
    limit BIGINT NOT NULL,
    period TEXT NOT NULL DEFAULT 'monthly' CHECK (period IN ('hourly', 'daily', 'weekly', 'monthly', 'yearly')),
    period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    used BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, resource_type, period)
);

CREATE INDEX IF NOT EXISTS idx_quotas_user_id ON public.quotas(user_id);
CREATE INDEX IF NOT EXISTS idx_quotas_plan_type ON public.quotas(plan_type);
CREATE INDEX IF NOT EXISTS idx_quotas_period_start ON public.quotas(period_start);

COMMENT ON TABLE public.quotas IS 'User quotas per resource type and period';
COMMENT ON COLUMN public.quotas.limit IS 'Maximum allowed usage in the period';
COMMENT ON COLUMN public.quotas.used IS 'Current usage in the period';
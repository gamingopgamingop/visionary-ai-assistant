-- Migration: 007_audit_logs.sql
-- Creates the audit logs table

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id UUID,
    success BOOLEAN NOT NULL,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON public.audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_id ON public.audit_logs(resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_success ON public.audit_logs(success);

COMMENT ON TABLE public.audit_logs IS 'Security audit log for sensitive operations';
COMMENT ON COLUMN public.audit_logs.action IS 'Action performed (e.g., LOGIN_SUCCESS, API_KEY_CREATED)';
COMMENT ON COLUMN public.audit_logs.resource_type IS 'Type of resource affected';
COMMENT ON COLUMN public.audit_logs.resource_id IS 'ID of resource affected';
COMMENT ON COLUMN public.audit_logs.metadata IS 'Additional context (no secrets)';
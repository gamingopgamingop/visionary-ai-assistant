-- Migration: 20261001000012_rls_policies.sql
-- RLS policies for new tables

-- Enable RLS on all new tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connector_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connector_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.background_jobs ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Service role can manage all profiles" ON public.profiles
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Roles policies (read-only for users, full for service role)
CREATE POLICY "Users can view roles" ON public.roles
    FOR SELECT USING (true);

CREATE POLICY "Service role can manage roles" ON public.roles
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Permissions policies (read-only for users, full for service role)
CREATE POLICY "Users can view permissions" ON public.permissions
    FOR SELECT USING (true);

CREATE POLICY "Service role can manage permissions" ON public.permissions
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Role permissions policies
CREATE POLICY "Users can view role permissions" ON public.role_permissions
    FOR SELECT USING (true);

CREATE POLICY "Service role can manage role permissions" ON public.role_permissions
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- User roles policies
CREATE POLICY "Users can view own roles" ON public.user_roles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage user roles" ON public.user_roles
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- User devices policies
CREATE POLICY "Users can view own devices" ON public.user_devices
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own devices" ON public.user_devices
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own devices" ON public.user_devices
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all devices" ON public.user_devices
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- User sessions policies
CREATE POLICY "Users can view own sessions" ON public.user_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions" ON public.user_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON public.user_sessions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all sessions" ON public.user_sessions
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- API keys v2 policies
CREATE POLICY "Users can view own API keys" ON public.api_keys_v2
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own API keys" ON public.api_keys_v2
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own API keys" ON public.api_keys_v2
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all API keys" ON public.api_keys_v2
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Connector connections policies
CREATE POLICY "Users can view own connector connections" ON public.connector_connections
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own connector connections" ON public.connector_connections
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own connector connections" ON public.connector_connections
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all connector connections" ON public.connector_connections
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Connector permissions policies
CREATE POLICY "Users can view own connector permissions" ON public.connector_permissions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.connector_connections cc
            WHERE cc.id = connector_permissions.connection_id
            AND cc.user_id = auth.uid()
        )
    );

CREATE POLICY "Service role can manage connector permissions" ON public.connector_permissions
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Audit logs policies
CREATE POLICY "Users can view own audit logs" ON public.audit_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all audit logs" ON public.audit_logs
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Usage records policies
CREATE POLICY "Users can view own usage records" ON public.usage_records
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all usage records" ON public.usage_records
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Quotas policies
CREATE POLICY "Users can view own quotas" ON public.quotas
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all quotas" ON public.quotas
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- AI providers policies
CREATE POLICY "Users can view enabled AI providers" ON public.ai_providers
    FOR SELECT USING (enabled = true);

CREATE POLICY "Service role can manage AI providers" ON public.ai_providers
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- AI models policies
CREATE POLICY "Users can view active AI models" ON public.ai_models
    FOR SELECT USING (status = 'active');

CREATE POLICY "Service role can manage AI models" ON public.ai_models
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Background jobs policies
CREATE POLICY "Users can view own jobs" ON public.background_jobs
    FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can create own jobs" ON public.background_jobs
    FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Service role can manage all jobs" ON public.background_jobs
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.roles TO anon, authenticated;
GRANT SELECT ON public.permissions TO anon, authenticated;
GRANT SELECT ON public.role_permissions TO anon, authenticated;
GRANT SELECT ON public.ai_providers TO anon, authenticated;
GRANT SELECT ON public.ai_models TO anon, authenticated;
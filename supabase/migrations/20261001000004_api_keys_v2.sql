-- Migration: 004_api_keys_v2.sql
-- Creates the versioned API keys table

CREATE TABLE IF NOT EXISTS public.api_keys_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    prefix TEXT NOT NULL,
    key_hash TEXT NOT NULL,
    scopes TEXT[] NOT NULL DEFAULT '{}',
    expires_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_api_keys_v2_key_hash ON public.api_keys_v2(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_v2_user_id ON public.api_keys_v2(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_v2_revoked ON public.api_keys_v2(revoked);
CREATE INDEX IF NOT EXISTS idx_api_keys_v2_expires_at ON public.api_keys_v2(expires_at);

COMMENT ON TABLE public.api_keys_v2 IS 'Versioned API keys with hashed storage';
COMMENT ON COLUMN public.api_keys_v2.prefix IS 'Public prefix for key identification (e.g., vk_live_)';
COMMENT ON COLUMN public.api_keys_v2.key_hash IS 'SHA-256 hash of the full API key';
COMMENT ON COLUMN public.api_keys_v2.scopes IS 'Array of permission scopes';
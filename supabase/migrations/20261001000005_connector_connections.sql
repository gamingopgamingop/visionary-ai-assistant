-- Migration: 005_connector_connections.sql
-- Creates the connector connections table

CREATE TABLE IF NOT EXISTS public.connector_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    connector_id TEXT NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'error', 'revoked', 'expired')),
    auth_type TEXT NOT NULL CHECK (auth_type IN ('oauth2', 'api_key', 'bearer_token', 'basic', 'none')),
    config JSONB NOT NULL DEFAULT '{}',
    credentials JSONB NOT NULL DEFAULT '{}',
    last_used_at TIMESTAMPTZ,
    last_error TEXT,
    error_count INTEGER NOT NULL DEFAULT 0,
    expires_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_connector_connections_user_connector 
    ON public.connector_connections(user_id, connector_id);
CREATE INDEX IF NOT EXISTS idx_connector_connections_user_id ON public.connector_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_connector_connections_connector_id ON public.connector_connections(connector_id);
CREATE INDEX IF NOT EXISTS idx_connector_connections_status ON public.connector_connections(status);

COMMENT ON TABLE public.connector_connections IS 'User connector connections (OAuth tokens, API keys, etc.)';
COMMENT ON COLUMN public.connector_connections.connector_id IS 'Connector identifier (e.g., github, google, slack)';
COMMENT ON COLUMN public.connector_connections.auth_type IS 'Authentication type for this connector';
COMMENT ON COLUMN public.connector_connections.config IS 'Connector-specific configuration';
COMMENT ON COLUMN public.connector_connections.credentials IS 'Encrypted credentials (tokens, keys)';
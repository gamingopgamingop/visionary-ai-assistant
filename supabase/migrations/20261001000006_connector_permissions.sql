-- Migration: 006_connector_permissions.sql
-- Creates the connector permissions table

CREATE TABLE IF NOT EXISTS public.connector_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID NOT NULL REFERENCES public.connector_connections(id) ON DELETE CASCADE,
    permission TEXT NOT NULL,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    UNIQUE (connection_id, permission)
);

CREATE INDEX IF NOT EXISTS idx_connector_permissions_connection_id 
    ON public.connector_permissions(connection_id);
CREATE INDEX IF NOT EXISTS idx_connector_permissions_permission 
    ON public.connector_permissions(permission);

COMMENT ON TABLE public.connector_permissions IS 'Fine-grained permissions per connector connection';
COMMENT ON COLUMN public.connector_permissions.permission IS 'Permission identifier (e.g., github.repositories.read)';
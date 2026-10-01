-- Migration: 010_ai_providers.sql
-- Creates the AI providers and models tables

CREATE TABLE IF NOT EXISTS public.ai_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('openai', 'anthropic', 'gemini', 'huggingface', 'nvidia', 'ollama', 'vllm', 'openai_compatible')),
    base_url TEXT,
    api_key_env TEXT,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    priority INTEGER NOT NULL DEFAULT 0,
    health_check_url TEXT,
    health_check_interval INTEGER NOT NULL DEFAULT 300,
    config JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ai_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES public.ai_providers(id) ON DELETE CASCADE,
    model_id TEXT NOT NULL,
    display_name TEXT NOT NULL,
    capabilities TEXT[] NOT NULL DEFAULT '{}',
    context_length INTEGER NOT NULL DEFAULT 4096,
    max_output_tokens INTEGER,
    input_cost_per_1k_tokens DECIMAL(10, 6),
    output_cost_per_1k_tokens DECIMAL(10, 6),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deprecated', 'disabled')),
    priority INTEGER NOT NULL DEFAULT 0,
    health_status TEXT NOT NULL DEFAULT 'unknown' CHECK (health_status IN ('healthy', 'degraded', 'unhealthy', 'unknown')),
    last_health_check TIMESTAMPTZ,
    config JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (provider_id, model_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_providers_enabled ON public.ai_providers(enabled);
CREATE INDEX IF NOT EXISTS idx_ai_providers_type ON public.ai_providers(type);
CREATE INDEX IF NOT EXISTS idx_ai_models_provider_id ON public.ai_models(provider_id);
CREATE INDEX IF NOT EXISTS idx_ai_models_model_id ON public.ai_models(model_id);
CREATE INDEX IF NOT EXISTS idx_ai_models_status ON public.ai_models(status);
CREATE INDEX IF NOT EXISTS idx_ai_models_health_status ON public.ai_models(health_status);
CREATE INDEX IF NOT EXISTS idx_ai_models_capabilities ON public.ai_models USING GIN(capabilities);

COMMENT ON TABLE public.ai_providers IS 'AI provider configurations';
COMMENT ON TABLE public.ai_models IS 'AI models available through providers';
COMMENT ON COLUMN public.ai_models.capabilities IS 'Model capabilities (chat, completion, embeddings, images, etc.)';
COMMENT ON COLUMN public.ai_models.health_status IS 'Current health status of the model endpoint';
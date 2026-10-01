# Database v2

## Overview

Additive database schema for the Visionary AI Assistant v2 architecture. All tables are new and do not modify existing schema.

## Migration Files

| File | Description |
|------|-------------|
| `20261001000001_auth_profiles.sql` | User profiles |
| `20261001000002_rbac.sql` | Roles, permissions, mappings |
| `20261001000003_devices.sql` | Devices and sessions |
| `20261001000004_api_keys_v2.sql` | Versioned API keys |
| `20261001000005_connector_connections.sql` | Connector connections |
| `20261001000006_connector_permissions.sql` | Connector permissions |
| `20261001000007_audit_logs.sql` | Security audit logs |
| `20261001000008_usage_records.sql` | Usage tracking |
| `20261001000009_quotas.sql` | User quotas |
| `20261001000010_ai_providers.sql` | AI providers and models |
| `20261001000011_background_jobs.sql` | Background job queue |
| `20261001000012_rls_policies.sql` | Row Level Security |

## Table Definitions

### profiles
Extends Supabase Auth users with application-specific data.

```sql
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'user',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'banned', 'pending')),
    banned_until TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_status ON profiles(status);
```

### roles
RBAC roles with hierarchy levels.

```sql
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    level INTEGER NOT NULL DEFAULT 0,
    system BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### permissions
Fine-grained permissions in resource:action format.

```sql
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    resource TEXT NOT NULL,
    action TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_permissions_resource ON permissions(resource);
```

### role_permissions
Many-to-many mapping between roles and permissions.

```sql
CREATE TABLE role_permissions (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission_id ON role_permissions(permission_id);
```

### user_roles
User-role assignments with audit trail.

```sql
CREATE TABLE user_roles (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    PRIMARY KEY (user_id, role_id)
);

CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);
```

### user_devices
Device tracking for session management.

```sql
CREATE TABLE user_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,
    user_agent TEXT,
    ip_address INET,
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    trusted BOOLEAN NOT NULL DEFAULT FALSE,
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_devices_user_id ON user_devices(user_id);
CREATE INDEX idx_user_devices_revoked ON user_devices(revoked);
```

### user_sessions
Session management with device binding.

```sql
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    device_id UUID REFERENCES user_devices(id) ON DELETE SET NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_revoked ON user_sessions(revoked);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX idx_user_sessions_device_id ON user_sessions(device_id);
```

### api_keys_v2
Versioned API keys with secure hash storage.

```sql
CREATE TABLE api_keys_v2 (
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

CREATE UNIQUE INDEX idx_api_keys_v2_key_hash ON api_keys_v2(key_hash);
CREATE INDEX idx_api_keys_v2_user_id ON api_keys_v2(user_id);
CREATE INDEX idx_api_keys_v2_revoked ON api_keys_v2(revoked);
CREATE INDEX idx_api_keys_v2_expires_at ON api_keys_v2(expires_at);
```

### oauth_states
OAuth2 PKCE state storage.

```sql
CREATE TABLE oauth_states (
    state TEXT PRIMARY KEY,
    code_verifier TEXT,
    redirect_uri TEXT NOT NULL,
    connector_id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    scopes TEXT[] NOT NULL DEFAULT '{}',
    created_at BIGINT NOT NULL,
    expires_at BIGINT NOT NULL
);

CREATE INDEX idx_oauth_states_user_id ON oauth_states(user_id);
CREATE INDEX idx_oauth_states_expires_at ON oauth_states(expires_at);
```

### connector_connections
User connector configurations with encrypted credentials.

```sql
CREATE TABLE connector_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    connector_id TEXT NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'error', 'revoked', 'expired')),
    auth_type TEXT NOT NULL CHECK (auth_type IN ('oauth2', 'api_key', 'bearer_token', 'basic', 'none')),
    config JSONB NOT NULL DEFAULT '{}',
    credentials JSONB NOT NULL DEFAULT '{}',
    permissions TEXT[] NOT NULL DEFAULT '{}',
    last_used_at TIMESTAMPTZ,
    last_error TEXT,
    error_count INTEGER NOT NULL DEFAULT 0,
    expires_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_connector_connections_user_connector ON connector_connections(user_id, connector_id);
CREATE INDEX idx_connector_connections_user_id ON connector_connections(user_id);
CREATE INDEX idx_connector_connections_connector_id ON connector_connections(connector_id);
CREATE INDEX idx_connector_connections_status ON connector_connections(status);
```

### connector_permissions
Fine-grained permissions per connector connection.

```sql
CREATE TABLE connector_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID NOT NULL REFERENCES connector_connections(id) ON DELETE CASCADE,
    permission TEXT NOT NULL,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    UNIQUE (connection_id, permission)
);

CREATE INDEX idx_connector_permissions_connection_id ON connector_permissions(connection_id);
CREATE INDEX idx_connector_permissions_permission ON connector_permissions(permission);
```

### security_events
Security audit events.

```sql
CREATE TABLE security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    success BOOLEAN NOT NULL,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_security_events_user_id ON security_events(user_id);
CREATE INDEX idx_security_events_event_type ON security_events(event_type);
CREATE INDEX idx_security_events_created_at ON security_events(created_at);
```

### audit_logs
Comprehensive audit trail.

```sql
CREATE TABLE audit_logs (
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

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX idx_audit_logs_resource_id ON audit_logs(resource_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_success ON audit_logs(success);
```

### usage_records
Usage tracking for quota enforcement.

```sql
CREATE TABLE usage_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider_id UUID REFERENCES ai_providers(id) ON DELETE SET NULL,
    model_id UUID REFERENCES ai_models(id) ON DELETE SET NULL,
    resource_type TEXT NOT NULL CHECK (resource_type IN ('ai_requests', 'ai_tokens', 'ai_images', 'connector_calls', 'api_calls', 'storage', 'background_jobs')),
    resource_id UUID,
    quantity BIGINT NOT NULL DEFAULT 1,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_usage_records_user_id ON usage_records(user_id);
CREATE INDEX idx_usage_records_provider_id ON usage_records(provider_id);
CREATE INDEX idx_usage_records_model_id ON usage_records(model_id);
CREATE INDEX idx_usage_records_resource_type ON usage_records(resource_type);
CREATE INDEX idx_usage_records_resource_id ON usage_records(resource_id);
CREATE INDEX idx_usage_records_created_at ON usage_records(created_at);
CREATE INDEX idx_usage_records_user_resource_created ON usage_records(user_id, resource_type, created_at);
```

### quotas
User quotas per resource type and period.

```sql
CREATE TABLE quotas (
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

CREATE INDEX idx_quotas_user_id ON quotas(user_id);
CREATE INDEX idx_quotas_plan_type ON quotas(plan_type);
CREATE INDEX idx_quotas_period_start ON quotas(period_start);
```

### ai_providers
AI provider configurations.

```sql
CREATE TABLE ai_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('openai', 'anthropic', 'gemini', 'huggingface', 'nvidia', 'ollama', 'vllm', 'openai_compatible')),
    base_url TEXT,
    api_key_env TEXT,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    priority INTEGER NOT NULL DEFAULT 0,
    health_check_url TEXT,
    health_check_interval_ms INTEGER NOT NULL DEFAULT 300000,
    config JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_providers_enabled ON ai_providers(enabled);
CREATE INDEX idx_ai_providers_type ON ai_providers(type);
```

### ai_models
AI model registry with capabilities and health.

```sql
CREATE TABLE ai_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES ai_providers(id) ON DELETE CASCADE,
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

CREATE INDEX idx_ai_models_provider_id ON ai_models(provider_id);
CREATE INDEX idx_ai_models_model_id ON ai_models(model_id);
CREATE INDEX idx_ai_models_status ON ai_models(status);
CREATE INDEX idx_ai_models_health_status ON ai_models(health_status);
CREATE INDEX idx_ai_models_capabilities ON ai_models USING GIN(capabilities);
```

### background_jobs
Background job queue for async processing.

```sql
CREATE TABLE background_jobs (
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

CREATE INDEX idx_background_jobs_status ON background_jobs(status);
CREATE INDEX idx_background_jobs_job_type ON background_jobs(job_type);
CREATE INDEX idx_background_jobs_user_id ON background_jobs(user_id);
CREATE INDEX idx_background_jobs_scheduled_at ON background_jobs(scheduled_at);
CREATE INDEX idx_background_jobs_priority_scheduled ON background_jobs(priority DESC, scheduled_at ASC);
```

## RLS Policies

All tables have Row Level Security enabled with policies:

### User Data Access
```sql
-- Users can only access their own data
CREATE POLICY "Users own data" ON table_name
    FOR ALL USING (auth.uid() = user_id);
```

### Read-Only for Users
```sql
-- Users can view reference data
CREATE POLICY "Users can view" ON table_name
    FOR SELECT USING (true);
```

### Service Role Bypass
```sql
-- Service role has full access
CREATE POLICY "Service role all" ON table_name
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
```

### Connector Permissions
```sql
-- Users can view permissions for their connections
CREATE POLICY "Users own connector permissions" ON connector_permissions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM connector_connections cc
            WHERE cc.id = connector_permissions.connection_id
            AND cc.user_id = auth.uid()
        )
    );
```

## Indexes Summary

### Primary Keys
All tables use UUID primary keys with `gen_random_uuid()`.

### Foreign Keys
- `profiles.id` → `auth.users(id)` CASCADE
- `user_roles.user_id` → `auth.users(id)` CASCADE
- `user_roles.role_id` → `roles(id)` CASCADE
- `role_permissions.role_id` → `roles(id)` CASCADE
- `role_permissions.permission_id` → `permissions(id)` CASCADE
- `user_devices.user_id` → `auth.users(id)` CASCADE
- `user_sessions.user_id` → `auth.users(id)` CASCADE
- `user_sessions.device_id` → `user_devices(id)` SET NULL
- `api_keys_v2.user_id` → `auth.users(id)` CASCADE
- `oauth_states.user_id` → `auth.users(id)` CASCADE
- `connector_connections.user_id` → `auth.users(id)` CASCADE
- `connector_permissions.connection_id` → `connector_connections(id)` CASCADE
- `audit_logs.user_id` → `auth.users(id)` SET NULL
- `usage_records.user_id` → `auth.users(id)` CASCADE
- `usage_records.provider_id` → `ai_providers(id)` SET NULL
- `usage_records.model_id` → `ai_models(id)` SET NULL
- `quotas.user_id` → `auth.users(id)` CASCADE
- `ai_models.provider_id` → `ai_providers(id)` CASCADE
- `background_jobs.user_id` → `auth.users(id)` SET NULL

### Performance Indexes
- Composite indexes for common query patterns
- Partial indexes for filtered queries
- GIN indexes for JSONB and array columns

## Constraints

### Check Constraints
- Status enums on all status columns
- Period enums on quota periods
- Plan type enums on quota plans
- Health status enums on models

### Unique Constraints
- `roles.name`
- `permissions.name`
- `api_keys_v2.key_hash`
- `connector_connections(user_id, connector_id)`
- `connector_permissions(connection_id, permission)`
- `quotas(user_id, resource_type, period)`
- `ai_models(provider_id, model_id)`

## Naming Conventions

| Element | Convention |
|---------|------------|
| Tables | snake_case, plural |
| Columns | snake_case |
| Indexes | `idx_<table>_<columns>` |
| Foreign Keys | `<table>_<column>_fkey` |
| Check Constraints | `<table>_<column>_check` |
| Policies | Descriptive names |

## Migration Safety

### Additive Only
- No existing tables modified
- No existing columns modified
- No existing data migrated
- All new tables independent

### Rollback
Each migration can be rolled back independently:
```sql
DROP TABLE IF EXISTS new_table_name;
```

## Performance Considerations

### Partitioning (Future)
Large tables can be partitioned:
```sql
-- Audit logs by month
CREATE TABLE audit_logs_2026_01 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
```

### Archiving
Old data can be archived:
```sql
-- Move old audit logs to archive table
INSERT INTO audit_logs_archive SELECT * FROM audit_logs WHERE created_at < '2025-01-01';
DELETE FROM audit_logs WHERE created_at < '2025-01-01';
```

## Monitoring

### Table Sizes
```sql
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Index Usage
```sql
SELECT 
    indexrelname,
    idx_scan,
    pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

## Backup & Recovery

- Point-in-time recovery via Supabase
- Logical backups for critical tables
- Cross-region replication available
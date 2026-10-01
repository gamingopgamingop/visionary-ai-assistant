# Visionary AI Assistant - Architecture v2

## Overview

This document describes the new additive architecture (v2) for the Visionary AI Assistant. The architecture is designed to be completely isolated from the existing implementation and disabled by default via feature flags.

## Core Principles

1. **Additive Only** - No modifications to existing code
2. **Disabled by Default** - All v2 features require explicit enabling
3. **Isolated** - New architecture runs alongside existing implementation
4. **Scalable** - Designed for stateless edge functions with PostgreSQL for state
5. **Secure** - Least privilege, RBAC, RLS, encrypted secrets

## Feature Flags

| Flag | Default | Description |
|------|---------|-------------|
| `NEW_AUTH_ENABLED` | `false` | Supabase Auth based authentication |
| `NEW_CONNECTOR_ENGINE_ENABLED` | `false` | New connector engine v2 |
| `NEW_API_KEYS_ENABLED` | `false` | Versioned API key system |
| `NEW_AUDIT_ENABLED` | `false` | Security audit logging |
| `NEW_AI_GATEWAY_ENABLED` | `false` | AI provider gateway |
| `NEW_QUOTA_ENABLED` | `false` | Quota management system |
| `NEW_RBAC_ENABLED` | `false` | Role-based access control |
| `OBSERVABILITY_ENABLED` | `false` | Logging, metrics, tracing |
| `JOBS_V2_ENABLED` | `false` | Background job system |

## Architecture Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Edge Functions                          │
├─────────────────────────────────────────────────────────────┤
│  /auth          /connector-v2    /api-keys-v2              │
│  /ai-gateway-v2 /audit-v2        /jobs-v2                  │
│  /observability-v2                                     │
├─────────────────────────────────────────────────────────────┤
│                    _shared-v2 (common library)             │
├─────────────────────────────────────────────────────────────┤
│              PostgreSQL (Supabase)                         │
│  profiles, roles, permissions, user_roles,                │
│  user_devices, user_sessions, api_keys_v2,                │
│  connector_connections, connector_permissions,            │
│  audit_logs, usage_records, quotas,                       │
│  ai_providers, ai_models, background_jobs                 │
└─────────────────────────────────────────────────────────────┘
```

## Database Schema

### Core Tables

- **profiles** - User profiles extending Supabase Auth
- **roles** - RBAC roles with hierarchy levels
- **permissions** - Fine-grained permissions (resource:action)
- **role_permissions** - Many-to-many role-permission mapping
- **user_roles** - User-role assignments
- **user_devices** - Device tracking for sessions
- **user_sessions** - Session management

### Security Tables

- **api_keys_v2** - Hashed API keys with scopes and expiration
- **oauth_states** - OAuth PKCE state storage
- **security_events** - Security event log

### Connector Tables

- **connector_connections** - User connector configurations
- **connector_permissions** - Per-connection permissions

### AI Tables

- **ai_providers** - AI provider configurations
- **ai_models** - Model registry with capabilities and health

### Observability Tables

- **audit_logs** - Security audit trail
- **usage_records** - Usage tracking for quotas
- **quotas** - User quotas per resource type

### Job Tables

- **background_jobs** - Async job queue

## Authentication Flow (v2)

```
Request → JWT Validation → User Identity → Account Status Check → Authorization
```

1. Extract Bearer token from Authorization header
2. Validate JWT signature using Supabase JWT secret
3. Check token expiration, issuer, audience
4. Fetch user profile for role and metadata
5. Verify account status (active/suspended/banned)
6. Return UserIdentity with permissions

## Authorization Flow

```
UserIdentity → Permission Check → Role Check → Allow/Deny
```

- Permissions cached for 5 minutes
- Supports wildcard (`*`) permissions
- Resource-based and action-based checks

## Connector Engine v2

### Connector Lifecycle

```
Create Connection → OAuth/API Key Auth → Store Encrypted Credentials → 
Test Connection → Execute Actions → Token Auto-refresh → Revoke
```

### Supported Connectors

| Connector | Auth Type | Key Features |
|-----------|-----------|--------------|
| GitHub | OAuth2 | Repos, Issues, PRs, Commits, Webhooks |
| Google | OAuth2 | Gmail, Drive, Calendar, Sheets, Docs |
| Microsoft | OAuth2 | Outlook, OneDrive, Calendar, Teams |
| Slack | OAuth2 | Messages, Channels, Users |
| Discord | OAuth2 | Messages, Servers, Channels |
| Notion | OAuth2 | Pages, Databases, Search |
| Stripe | API Key | Customers, Products, Subscriptions |
| GitLab | OAuth2 | Repos, Issues, Merge Requests |
| Linear | API Key | Issues, Projects, Teams |
| Jira | Basic Auth | Issues, Projects, Users |
| Supabase | API Key | Database, Storage, Functions |
| Generic REST | API Key/Bearer | Custom REST APIs |
| Generic GraphQL | API Key/Bearer | Custom GraphQL APIs |
| Generic Webhook | None | Incoming webhooks |

## AI Gateway v2

### Request Flow

```
AI Request → Auth → AuthZ → Quota → Rate Limit → 
Model Router → Provider Health → Selected Provider → 
Model → Usage Recording → Response
```

### Provider Abstraction

Supports multiple providers for the same model with fallback:

```
NVIDIA Nemotron
    ↓ (fallback)
NVIDIA NIM
    ↓ (fallback)
vLLM
    ↓ (fallback)
Fireworks
    ↓ (fallback)
Other OpenAI-compatible endpoints
```

### Supported Provider Types

- OpenAI / OpenAI-compatible
- Anthropic
- Gemini
- Hugging Face
- NVIDIA (NIM)
- Ollama
- vLLM
- Generic OpenAI-compatible

### Model Capabilities

- `chat` - Chat completions
- `completion` - Text completions
- `embeddings` - Vector embeddings
- `images` - Image generation
- `audio` - Audio processing
- `video` - Video processing
- `code` - Code generation
- `reasoning` - Reasoning models

## Security

### Data Protection

- API keys stored as SHA-256 hashes only
- OAuth tokens encrypted with AES-GCM
- Secrets never logged (sanitized automatically)
- RLS policies on all user data

### Network Security

- Rate limiting per user, IP, API key, connector, model
- Circuit breakers for provider failures
- Exponential backoff with jitter
- Request/response timeouts

### Audit Trail

All security events logged:
- Authentication (success/failed)
- Session management
- API key lifecycle
- Connector operations
- AI requests and quota events
- Admin actions

## Scalability

- Stateless edge functions
- PostgreSQL for durable state
- Database indexes on query patterns
- Cursor-based pagination
- Connection pooling via Supabase
- Async job processing

## Enabling Features

To enable a feature, set the corresponding environment variable:

```bash
# Enable all v2 features
NEW_AUTH_ENABLED=true
NEW_CONNECTOR_ENGINE_ENABLED=true
NEW_API_KEYS_ENABLED=true
NEW_AUDIT_ENABLED=true
NEW_AI_GATEWAY_ENABLED=true
NEW_QUOTA_ENABLED=true
NEW_RBAC_ENABLED=true
OBSERVABILITY_ENABLED=true
JOBS_V2_ENABLED=true
```

## Migration Plan

See [docs/migration-plan-v2.md](./migration-plan-v2.md) for the phased migration from Clerk and existing systems.

## Rollback Strategy

All v2 features can be instantly disabled by setting feature flags to `false`. No database migrations need to be rolled back as they are additive.
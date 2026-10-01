# Migration Plan v2

## Overview

Phased migration from the existing Clerk-based architecture to the new Supabase Auth v2 architecture. Each phase is independent and reversible.

## Current State

- **Authentication**: Clerk (primary), Supabase Auth (for database)
- **Database**: Existing tables + some new tables
- **Connectors**: Existing connector engine
- **AI**: Existing AI implementation
- **API Keys**: Existing API key system

## Target State

- **Authentication**: Supabase Auth (primary)
- **Database**: All v2 tables + existing
- **Connectors**: Connector engine v2
- **AI**: AI Gateway v2
- **API Keys**: API Keys v2

## Phase 1: Infrastructure (Week 1-2)

### Goals
- Deploy all v2 database migrations
- Deploy v2 edge functions (disabled)
- Verify RLS policies
- Set up monitoring

### Tasks

#### Database
- [ ] Run all 12 migration files in order
- [ ] Verify RLS policies are active
- [ ] Verify indexes created
- [ ] Test foreign key constraints
- [ ] Seed system roles and permissions

#### Edge Functions
- [ ] Deploy `supabase/functions/auth/` (disabled)
- [ ] Deploy `supabase/functions/connector-v2/` (disabled)
- [ ] Deploy `supabase/functions/api-keys-v2/` (disabled)
- [ ] Deploy `supabase/functions/audit-v2/` (disabled)
- [ ] Deploy `supabase/functions/ai-gateway-v2/` (disabled)
- [ ] Deploy `supabase/functions/_shared-v2/`
- [ ] Deploy `supabase/functions/observability-v2/` (disabled)
- [ ] Deploy `supabase/functions/jobs-v2/` (disabled)

#### Configuration
- [ ] Add feature flags to environment (all `false`)
- [ ] Configure `SUPABASE_JWT_SECRET`
- [ ] Configure `CONNECTOR_ENCRYPTION_KEY`
- [ ] Configure `API_KEY_PREFIX`
- [ ] Set up health check endpoints

#### Verification
- [ ] Test database connectivity
- [ ] Test RLS policies with authenticated users
- [ ] Test service role access
- [ ] Verify audit log insertion
- [ ] Test quota initialization

### Rollback
- All feature flags remain `false`
- No user-facing changes
- Migrations can be dropped if needed

## Phase 2: Authentication Parallel Run (Week 3-4)

### Goals
- Enable new auth for internal testing
- Validate JWT validation
- Test session management
- Compare with Clerk

### Tasks

#### Enable Auth
- [ ] Set `NEW_AUTH_ENABLED=true` in staging
- [ ] Set `AUTH_PROVIDER=supabase`
- [ ] Configure JWT validation
- [ ] Test authentication middleware

#### Session Management
- [ ] Test session creation
- [ ] Test session validation
- [ ] Test session revocation
- [ ] Test device tracking

#### RBAC
- [ ] Test role assignment
- [ ] Test permission checks
- [ ] Test role hierarchy
- [ ] Test system roles

#### Parallel Validation
- [ ] Create test users in both systems
- [ ] Compare authentication results
- [ ] Verify user identity mapping
- [ ] Test account status checks

### Rollback
- Set `NEW_AUTH_ENABLED=false`
- Clerk remains primary

## Phase 3: Connector Engine v2 (Week 5-6)

### Goals
- Enable connector v2 for testing
- Migrate existing connections
- Test all connectors

### Tasks

#### Enable Connector v2
- [ ] Set `NEW_CONNECTOR_ENGINE_ENABLED=true`
- [ ] Register all built-in connectors
- [ ] Test connector registry

#### OAuth Flow
- [ ] Test GitHub OAuth
- [ ] Test Google OAuth
- [ ] Test Microsoft OAuth
- [ ] Test Slack OAuth
- [ ] Test Discord OAuth
- [ ] Test Notion OAuth

#### Token Management
- [ ] Test token refresh
- [ ] Test scheduled refresh
- [ ] Test token revocation

#### Actions
- [ ] Test GitHub actions (repos, issues, PRs)
- [ ] Test Google actions (Gmail, Drive, Calendar)
- [ ] Test Microsoft actions (Outlook, OneDrive)
- [ ] Test Slack actions
- [ ] Test other connectors

#### Permissions
- [ ] Test connector permissions
- [ ] Test action-level permissions
- [ ] Test permission granting/revoking

### Migration from v1
- [ ] Export existing connections
- [ ] Import to v2 format
- [ ] Verify credentials work
- [ ] Update frontend to use v2 endpoints

### Rollback
- Set `NEW_CONNECTOR_ENGINE_ENABLED=false`
- v1 connector engine remains

## Phase 4: API Keys v2 (Week 7)

### Goals
- Enable new API key system
- Test key lifecycle
- Test scope enforcement

### Tasks

#### Enable API Keys v2
- [ ] Set `NEW_API_KEYS_ENABLED=true`
- [ ] Test key creation
- [ ] Test key verification
- [ ] Test key revocation
- [ ] Test key rotation

#### Scopes
- [ ] Test connector scopes
- [ ] Test AI scopes
- [ ] Test admin scopes
- [ ] Test scope inheritance

#### Integration
- [ ] Test with connector engine
- [ ] Test with AI gateway
- [ ] Test rate limiting

### Rollback
- Set `NEW_API_KEYS_ENABLED=false`

## Phase 5: AI Gateway v2 (Week 8-9)

### Goals
- Enable AI gateway
- Test multi-provider routing
- Test fallback and quotas

### Tasks

#### Enable AI Gateway
- [ ] Set `NEW_AI_GATEWAY_ENABLED=true`
- [ ] Configure providers
- [ ] Register models
- [ ] Test health checks

#### Provider Routing
- [ ] Test NVIDIA Nemotron routing
- [ ] Test fallback chain
- [ ] Test circuit breakers
- [ ] Test provider priority

#### Quotas
- [ ] Set `NEW_QUOTA_ENABLED=true`
- [ ] Test quota enforcement
- [ ] Test plan tiers
- [ ] Test quota reset

#### Usage Tracking
- [ ] Test usage recording
- [ ] Test usage queries
- [ ] Test daily aggregation

#### Fallback
- [ ] Test automatic fallback
- [ ] Test circuit breaker
- [ ] Test retry with backoff

### Rollback
- Set `NEW_AI_GATEWAY_ENABLED=false`
- Set `NEW_QUOTA_ENABLED=false`

## Phase 6: Observability & Jobs (Week 10)

### Goals
- Enable observability
- Enable background jobs
- Test audit logging

### Tasks

#### Observability
- [ ] Set `OBSERVABILITY_ENABLED=true`
- [ ] Test structured logging
- [ ] Test metrics
- [ ] Test tracing
- [ ] Test health checks

#### Background Jobs
- [ ] Set `JOBS_V2_ENABLED=true`
- [ ] Test job queue
- [ ] Test worker
- [ ] Test scheduler
- [ ] Test default schedules

#### Audit Logging
- [ ] Set `NEW_AUDIT_ENABLED=true`
- [ ] Test security event logging
- [ ] Test audit queries
- [ ] Test log sanitization

### Rollback
- Set all flags to `false`

## Phase 7: Full Integration Testing (Week 11-12)

### Goals
- End-to-end testing
- Performance testing
- Security testing

### Tasks

#### Integration Tests
- [ ] Auth → Connector → Action
- [ ] Auth → AI Gateway → Provider
- [ ] API Key → Connector
- [ ] API Key → AI Gateway
- [ ] Webhook → Connector

#### Performance Tests
- [ ] Load test authentication
- [ ] Load test connector actions
- [ ] Load test AI requests
- [ ] Test rate limiting under load
- [ ] Test quota enforcement under load

#### Security Tests
- [ ] Test JWT validation edge cases
- [ ] Test OAuth PKCE
- [ ] Test API key hashing
- [ ] Test webhook verification
- [ ] Test RLS policies
- [ ] Test audit log completeness

#### Chaos Testing
- [ ] Provider failure simulation
- [ ] Database latency simulation
- [ ] Rate limit exhaustion
- [ ] Quota exhaustion
- [ ] Circuit breaker activation

## Phase 8: Gradual Rollout (Week 13-14)

### Goals
- Canary release to subset of users
- Monitor and iterate
- Prepare for full migration

### Tasks

#### Canary Release
- [ ] Enable for internal users
- [ ] Enable for beta users (5%)
- [ ] Monitor error rates
- [ ] Monitor latency
- [ ] Monitor quota usage

#### Feedback Loop
- [ ] Collect user feedback
- [ ] Fix critical issues
- [ ] Optimize performance
- [ ] Update documentation

#### Gradual Increase
- [ ] 25% of users
- [ ] 50% of users
- [ ] 100% of users

## Phase 9: Clerk Migration (Separate Project)

### Goals
- Migrate all users to Supabase Auth
- Decommission Clerk
- Update frontend

### Tasks
- [ ] Export Clerk users
- [ ] Import to Supabase Auth
- [ ] Map user IDs
- [ ] Update frontend auth
- [ ] Test login flows
- [ ] Test password reset
- [ ] Test MFA
- [ ] Decommission Clerk

## Success Criteria

### Technical
- [ ] All v2 features pass integration tests
- [ ] < 1% error rate
- [ ] P95 latency < 500ms
- [ ] Zero data loss
- [ ] Zero security incidents

### Operational
- [ ] Documentation complete
- [ ] Runbooks created
- [ ] Alerting configured
- [ ] Team trained

### Business
- [ ] User satisfaction maintained
- [ ] No feature regressions
- [ ] Cost within budget

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Auth migration breaks login | Medium | High | Parallel run, instant rollback |
| Connector credentials fail | Low | High | Test all connectors in staging |
| AI provider failures | Medium | Medium | Circuit breakers, fallback |
| Quota enforcement bugs | Low | Medium | Extensive testing, monitoring |
| Performance regression | Low | High | Load testing, canary |
| Data loss | Very Low | Critical | Backups, PITR |

## Timeline Summary

| Phase | Duration | Key Deliverable |
|-------|----------|-----------------|
| 1. Infrastructure | 2 weeks | All v2 code deployed, disabled |
| 2. Auth Parallel | 2 weeks | Auth validated |
| 3. Connectors v2 | 2 weeks | Connectors validated |
| 4. API Keys v2 | 1 week | API keys validated |
| 5. AI Gateway v2 | 2 weeks | AI gateway validated |
| 6. Observability | 1 week | Monitoring active |
| 7. Integration | 2 weeks | E2E validated |
| 8. Rollout | 2 weeks | Production ready |
| **Total** | **14 weeks** | **Production ready** |

## Post-Migration

- [ ] Decommission v1 code
- [ ] Update documentation
- [ ] Team retrospective
- [ ] Plan next improvements
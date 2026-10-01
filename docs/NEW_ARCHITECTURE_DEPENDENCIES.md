# New Architecture Dependencies

This document lists all new dependencies required for the v2 architecture that are not in the existing package.json.

## Core Dependencies

### @supabase/supabase-js
- **Version**: ^2.39.0 (already in project)
- **Purpose**: Supabase client for database, auth, storage, realtime
- **Used by**: All v2 modules

### @clerk/backend
- **Version**: ^1.0.0 (already in project)
- **Purpose**: Clerk authentication (existing, not modified)
- **Used by**: Existing auth only

## Web Crypto API (Native)

All cryptographic operations use the native Web Crypto API available in Deno/Edge runtime:
- `crypto.subtle.digest()` - SHA-256, SHA-512
- `crypto.subtle.sign()` / `verify()` - HMAC-SHA256, Ed25519
- `crypto.subtle.encrypt()` / `decrypt()` - AES-GCM
- `crypto.subtle.importKey()` - Key import
- `crypto.subtle.generateKey()` - Key generation
- `crypto.getRandomValues()` - Random bytes
- `crypto.randomUUID()` - UUID generation

**No additional crypto dependencies required.**

## Optional Dependencies (Future)

These are NOT required for initial deployment but may be added later for production scaling:

### Redis Client (for distributed rate limiting)
```json
"@upstash/redis": "^1.28.0"
```
- **Purpose**: Replace in-memory rate limiter with distributed Redis
- **When needed**: Multi-instance edge function deployments
- **Alternative**: `ioredis` for self-hosted Redis

### Message Queue (for background jobs)
```json
"@upstash/qstash": "^2.0.0"
```
- **Purpose**: Reliable background job processing
- **When needed**: Production job processing with retries
- **Alternatives**: 
  - `bullmq` + Redis
  - `@google-cloud/tasks`
  - `aws-sdk` SQS

### Monitoring (optional)
```json
"@opentelemetry/api": "^1.7.0"
"@opentelemetry/sdk-node": "^0.48.0"
```
- **Purpose**: Distributed tracing
- **When needed**: Production observability

## Development Dependencies

### Testing
```json
"vitest": "^1.0.0",
"@vitest/coverage-v8": "^1.0.0"
```
- Already in project

### TypeScript
```json
"typescript": "^5.3.0"
```
- Already in project

## No New Runtime Dependencies Required

The v2 architecture is designed to work with:
1. Existing `@supabase/supabase-js`
2. Native Web Crypto API
3. Native Deno/Edge runtime APIs (fetch, performance, crypto)

## Environment Variables Required

Add these to your environment configuration (not package.json):

```env
# Feature Flags (all default false)
NEW_AUTH_ENABLED=false
NEW_CONNECTOR_ENGINE_ENABLED=false
NEW_API_KEYS_ENABLED=false
NEW_AUDIT_ENABLED=false
NEW_AI_GATEWAY_ENABLED=false
NEW_QUOTA_ENABLED=false
NEW_RBAC_ENABLED=false
OBSERVABILITY_ENABLED=false
JOBS_V2_ENABLED=false

# Auth
SUPABASE_JWT_SECRET=your-jwt-secret
SUPABASE_JWT_ISSUER=https://your-project.supabase.co/auth/v1
SUPABASE_JWT_AUDIENCE=authenticated

# Encryption
CONNECTOR_ENCRYPTION_KEY=32-byte-hex-key

# API Keys
API_KEY_PREFIX=vk
API_KEY_DEFAULT_EXPIRY_DAYS=90
API_KEY_MAX_PER_USER=10

# Audit
AUDIT_RETENTION_DAYS=365
AUDIT_BATCH_SIZE=100
AUDIT_FLUSH_INTERVAL_MS=5000

# Observability
OBSERVABILITY_SERVICE_NAME=visionary-ai
OBSERVABILITY_SAMPLE_RATE=1.0
OBSERVABILITY_EXPORT_INTERVAL_MS=30000

# Jobs
JOBS_MAX_CONCURRENT=10
JOBS_POLL_INTERVAL_MS=5000
JOBS_DEFAULT_MAX_ATTEMPTS=3
JOBS_DEFAULT_RETRY_DELAY_MS=60000

# Logging
LOG_LEVEL=info
LOG_PRETTY=false
```

## Installation

No `npm install` required for v2 architecture - all dependencies are either:
1. Already in package.json
2. Native platform APIs

## Verification

To verify all dependencies work:

```bash
# TypeScript compilation
npx tsc --noEmit

# Run tests (when created)
npm test

# Deploy to Supabase
supabase functions deploy
```
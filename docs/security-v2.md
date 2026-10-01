# Security v2

## Overview

Security architecture for the Visionary AI Assistant v2, implementing defense in depth across all layers.

## Core Principles

1. **Least Privilege** - Minimum required permissions
2. **Defense in Depth** - Multiple security layers
3. **Zero Trust** - Verify every request
4. **Audit Everything** - Complete security trail
5. **Fail Secure** - Default deny

## Data Protection

### Encryption

| Data | Algorithm | Key Management |
|------|-----------|----------------|
| OAuth Tokens | AES-256-GCM | `CONNECTOR_ENCRYPTION_KEY` |
| API Keys | SHA-256 Hash | Not stored (hash only) |
| Secrets | AES-256-GCM | `CONNECTOR_ENCRYPTION_KEY` |
| Webhook Payloads | Not encrypted | Verify signatures |

### Key Rotation

```typescript
// Rotate encryption key (re-encrypts all stored credentials)
await rotateEncryptionKey(newKey);
```

## Authentication Security

### JWT Validation

- HMAC-SHA256 signature verification
- Expiration checking
- Issuer validation
- Audience validation
- Clock skew tolerance: 30 seconds

### Session Security

- Cryptographically random session IDs
- Configurable expiration (default 30 days)
- Device binding
- Concurrent session limits
- Instant revocation

### Device Security

- Device fingerprinting
- Trusted device marking
- Automatic revocation on suspicious activity
- Last seen tracking

## API Key Security

### Key Generation

```typescript
// Format: vk_<32-byte-hex>
const apiKey = generateApiKey('vk');
// Result: vk_a1b2c3d4e5f6...
```

### Storage

- Only SHA-256 hash stored in database
- Prefix stored for identification
- Plaintext key shown once at creation
- Scopes enforced per-request

### Verification

```typescript
const keyHash = await hashApiKey(key);
const valid = await verifyApiKeyHash(key, storedHash);
```

## OAuth Security

### PKCE (Proof Key for Code Exchange)

All OAuth2 flows use PKCE:
- Random code_verifier (32 bytes)
- SHA-256 code_challenge
- Prevents authorization code interception

### State Parameter

- Cryptographically random state (32 bytes)
- 10-minute expiration
- Single-use, deleted after callback

### Token Storage

- Access tokens encrypted with AES-GCM
- Refresh tokens encrypted with AES-GCM
- Automatic refresh before expiry
- Revocation on security events

## Webhook Security

### Signature Verification

| Provider | Algorithm | Header |
|----------|-----------|--------|
| GitHub | HMAC-SHA256 | X-Hub-Signature-256 |
| Stripe | HMAC-SHA256 | Stripe-Signature |
| Slack | HMAC-SHA256 | X-Slack-Signature |
| Discord | Ed25519 | X-Signature-Ed25519 |

### Constant-Time Comparison

All signature comparisons use constant-time algorithms to prevent timing attacks.

## Rate Limiting

Multi-dimensional rate limiting:

```typescript
// Per user
await rateLimiter.checkUserLimit(userId);

// Per API key
await rateLimiter.checkApiKeyLimit(prefix);

// Per connector
await rateLimiter.checkConnectorLimit(userId, connectorId);

// Per model
await rateLimiter.checkModelLimit(userId, modelId);

// Per endpoint
await rateLimiter.checkEndpointLimit(userId, endpoint);

// Per IP
await rateLimiter.checkIPLimit(ip);

// Global
await rateLimiter.checkGlobalLimit();
```

### Limits

| Dimension | Default | Window |
|-----------|---------|--------|
| User | 100 | 1 minute |
| API Key | 100 | 1 minute |
| Connector | 100 | 1 minute |
| Model | 50 | 1 minute |
| Endpoint | 100 | 1 minute |
| IP | 50 | 1 minute |
| Global | 1000 | 1 minute |

## Quota Enforcement

Per-user quotas with automatic enforcement:

```typescript
const result = await checkQuota(userId, 'ai_requests', 1);
if (!result.allowed) {
    throw new QuotaExceededError('ai_requests');
}
```

## Input Validation

### Validation Rules

```typescript
const rules = [
    { field: 'email', required: true, type: 'email' },
    { field: 'name', required: true, type: 'string', minLength: 1, maxLength: 100 },
    { field: 'age', required: false, type: 'number', min: 13, max: 120 },
    { field: 'role', required: true, type: 'string', enum: ['user', 'admin'] },
];
```

### Sanitization

- HTML tag removal
- SQL injection prevention (parameterized queries)
- XSS prevention (output encoding)
- Path traversal prevention

## RLS (Row Level Security)

All user data protected by RLS:

```sql
-- Users can only access their own data
CREATE POLICY "Users own data" ON table_name
    FOR ALL USING (auth.uid() = user_id);

-- Service role bypasses RLS
CREATE POLICY "Service role all" ON table_name
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
```

## Audit Logging

All security events logged:

| Event | Description |
|-------|-------------|
| LOGIN_SUCCESS | Successful authentication |
| LOGIN_FAILED | Failed authentication |
| LOGOUT | User logout |
| SESSION_REVOKED | Session terminated |
| API_KEY_CREATED | New API key |
| API_KEY_REVOKED | API key revoked |
| API_KEY_ROTATED | API key rotated |
| CONNECTOR_CREATED | New connector connection |
| CONNECTOR_REVOKED | Connector revoked |
| CONNECTOR_TOKEN_REFRESHED | Token refreshed |
| AI_REQUEST | AI request made |
| AI_QUOTA_EXCEEDED | Quota limit reached |
| ROLE_CHANGED | Role assignment changed |
| PERMISSION_CHANGED | Permission changed |
| ADMIN_ACTION | Administrative action |

### Log Sanitization

Sensitive fields automatically redacted:
- `password`, `token`, `secret`, `key`
- `access_token`, `refresh_token`
- `api_key`, `client_secret`
- `jwt`, `cookie`, `session`
- `credit_card`, `ssn`

## Circuit Breakers

Per-provider circuit breakers:

```typescript
const breaker = circuitBreakers.getBreaker('openai');

if (breaker.isAvailable('openai')) {
    // Make request
    breaker.recordSuccess('openai');
} else {
    // Fail fast
    breaker.recordFailure('openai');
}
```

## Headers Security

Required security headers:

```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: default-src 'self'
Permissions-Policy: geolocation=(), microphone=()
```

## CORS

Configurable CORS with secure defaults:

```typescript
const corsHeaders = {
    'Access-Control-Allow-Origin': 'https://app.example.com',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'true',
};
```

## Error Handling

Safe error messages - no sensitive data leaked:

```typescript
// Internal error details logged server-side
console.error('Database error:', error);

// Client receives generic message
return errorResponse('Internal server error', 500);
```

## Dependency Security

- No mandatory external dependencies for core features
- Optional Redis/Upstash for distributed rate limiting
- All crypto uses Web Crypto API (native)
- Regular security audits recommended

## Incident Response

### Security Event Response

1. Detect via audit logs
2. Revoke compromised credentials
3. Force password reset
4. Notify affected users
5. Document incident

### Key Compromise

```typescript
// Revoke all user sessions
await revokeAllUserSessions(userId);

// Revoke all API keys
await revokeAllUserApiKeys(userId);

// Rotate encryption key
await rotateEncryptionKey(newKey);
```
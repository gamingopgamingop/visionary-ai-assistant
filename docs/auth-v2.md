# Authentication v2

## Overview

The new authentication system uses Supabase Auth JWT validation as the primary authentication mechanism, running alongside the existing Clerk implementation.

## Configuration

```env
NEW_AUTH_ENABLED=false
AUTH_PROVIDER=supabase
SUPABASE_JWT_SECRET=your-jwt-secret
SUPABASE_JWT_ISSUER=https://your-project.supabase.co/auth/v1
SUPABASE_JWT_AUDIENCE=authenticated
```

## JWT Validation

The system validates JWTs by:
1. Verifying HMAC-SHA256 signature using `SUPABASE_JWT_SECRET`
2. Checking token expiration (`exp` claim)
3. Validating issuer (`iss` claim)
4. Validating audience (`aud` claim)

## User Identity

On successful authentication, a `UserIdentity` object is returned:

```typescript
interface UserIdentity {
  id: string;              // Supabase user UUID
  email?: string;          // User email
  role: string;            // User role from profiles table
  metadata: Record<string, unknown>; // Additional user metadata
}
```

## Account Status Checks

The system checks the user's account status from the `profiles` table:

- `active` - Normal access
- `suspended` - Access denied
- `banned` - Access denied (with optional `banned_until` for temporary bans)
- `pending` - Access denied

## Sessions

Session management includes:
- Device tracking
- Session revocation (single or all)
- Activity tracking
- Configurable expiration (default 30 days)

## Devices

Device management:
- Automatic registration on new login
- Trusted device marking
- Device revocation
- Last seen tracking

## RBAC

Role-based access control with hierarchy:

| Role | Level | Description |
|------|-------|-------------|
| `super_admin` | 100 | Full system access |
| `admin` | 50 | Elevated access |
| `user` | 10 | Standard access |
| `viewer` | 1 | Read-only |

## Permissions

Fine-grained permissions using `resource:action` format:

```
connector.read
connector.create
github.repositories.read
google.gmail.send
ai.chat
admin.users.read
```

Permissions are cached for 5 minutes per user.

## Usage

```typescript
import { authenticateRequest, requireAuth } from './auth/middleware.ts';
import { checkPermission, requirePermission } from './auth/authorization.ts';

// In an edge function
const user = await requireAuth(req);
await requirePermission(user, 'github.repositories.read');
```

## Security Events

All authentication events are logged to `security_events` table:

- `LOGIN_SUCCESS`
- `LOGIN_FAILED`
- `LOGOUT`
- `SESSION_REVOKED`
- `DEVICE_ADDED`
- `DEVICE_REVOKED`
- `ROLE_CHANGED`
- `PERMISSION_CHANGED`

## Migration from Clerk

The new system is designed to coexist with Clerk. Migration steps:

1. Enable `NEW_AUTH_ENABLED=true` in staging
2. Migrate user profiles to Supabase Auth
3. Update frontend to use Supabase Auth
4. Disable Clerk after verification
# RBAC v2

## Overview

Role-Based Access Control system with fine-grained permissions for the Visionary AI Assistant.

## Core Concepts

### Roles
Roles define a collection of permissions. Each role has a level determining hierarchy.

```sql
CREATE TABLE roles (
    id UUID PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    level INTEGER NOT NULL DEFAULT 0,
    system BOOLEAN NOT NULL DEFAULT FALSE
);
```

### Permissions
Permissions are atomic access rules in `resource:action` format.

```sql
CREATE TABLE permissions (
    id UUID PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,      -- e.g., "github.repositories.read"
    description TEXT,
    resource TEXT NOT NULL,         -- e.g., "github.repositories"
    action TEXT NOT NULL            -- e.g., "read"
);
```

### Role-Permission Mapping
Many-to-many relationship between roles and permissions.

```sql
CREATE TABLE role_permissions (
    role_id UUID REFERENCES roles(id),
    permission_id UUID REFERENCES permissions(id),
    PRIMARY KEY (role_id, permission_id)
);
```

### User-Role Assignment
Users can have multiple roles.

```sql
CREATE TABLE user_roles (
    user_id UUID REFERENCES auth.users(id),
    role_id UUID REFERENCES roles(id),
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    granted_by UUID REFERENCES auth.users(id),
    PRIMARY KEY (user_id, role_id)
);
```

## Default System Roles

| Role | Level | Permissions |
|------|-------|-------------|
| `super_admin` | 100 | All permissions (`*`) |
| `admin` | 50 | Admin permissions + user management |
| `user` | 10 | Standard connector and AI permissions |
| `viewer` | 1 | Read-only access |

## Permission Categories

### Connector Permissions
```
connector.read
connector.create
connector.update
connector.delete
```

### GitHub
```
github.repositories.read
github.repositories.write
github.issues.read
github.issues.write
github.pull_requests.read
github.pull_requests.write
```

### Google
```
google.gmail.read
google.gmail.send
google.drive.read
google.drive.write
google.calendar.read
google.calendar.write
```

### Notion
```
notion.pages.read
notion.pages.write
```

### Stripe
```
stripe.customers.read
stripe.subscriptions.read
```

### AI
```
ai.chat
ai.completion
ai.embeddings
ai.images
```

### Admin
```
admin.users.read
admin.users.write
admin.roles.manage
admin.settings
```

## Usage

### Checking Permissions

```typescript
import { checkPermission, requirePermission } from '../auth/authorization.ts';

const user = await requireAuth(req);

// Check single permission
const result = await checkPermission(user, 'github.repositories.read');
if (!result.allowed) {
    throw new Error(result.reason);
}

// Check multiple permissions
await requirePermissions(user, [
    'github.repositories.read',
    'github.issues.read'
]);
```

### Checking Roles

```typescript
import { checkRole, requireRole } from '../auth/authorization.ts';

// Check single role
await requireRole(user, 'admin');

// Check any of multiple roles
await requireAnyRole(user, ['admin', 'super_admin']);
```

## RLS Policies

Users can only access their own data:

```sql
-- Profiles
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

-- User roles
CREATE POLICY "Users can view own roles" ON user_roles
    FOR SELECT USING (auth.uid() = user_id);

-- Service role bypasses RLS
CREATE POLICY "Service role can manage all" ON roles
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
```

## API Key Scopes

API keys use the same permission system:

```typescript
const scopes = [
    'connector.read',
    'github.repositories.read',
    'ai.chat'
];

const apiKey = await createApiKey(userId, {
    name: 'My API Key',
    scopes
});
```

## Best Practices

1. **Principle of Least Privilege** - Grant minimum required permissions
2. **Role Composition** - Compose roles from permissions, not permissions from roles
3. **Audit Changes** - All role/permission changes are logged
4. **Cache Invalidation** - Clear permission cache on changes
5. **System Roles** - Never delete system roles
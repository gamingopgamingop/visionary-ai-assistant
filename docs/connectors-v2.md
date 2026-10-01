# Connectors v2

## Overview

The new connector engine provides a unified framework for integrating with external services. Each connector is isolated and registered in a central registry.

## Architecture

```
Connector Registry
    ↓
Connector Manager (lifecycle)
    ↓
OAuth Manager / Token Manager
    ↓
Connector Instance → External API
```

## Connector Configuration

Each connector declares:

```typescript
interface ConnectorConfig {
    id: string;                    // Unique identifier
    name: string;                  // Short name
    displayName: string;           // Human-readable name
    description: string;           // Description
    category: string;              // Category (development, productivity, etc.)
    version: string;               // Connector version
    authType: 'oauth2' | 'api_key' | 'bearer_token' | 'basic' | 'none';
    oauth2?: OAuth2Config;         // OAuth2 configuration
    apiKey?: ApiKeyConfig;         // API key configuration
    baseUrl: string;               // API base URL
    endpoints: ConnectorEndpoints; // Available actions
    rateLimits?: RateLimitConfig;  // Rate limits
    requiredPermissions: string[]; // Required permissions
    optionalPermissions: string[]; // Optional permissions
    enabled: boolean;              // Enabled status
}
```

## Supported Connectors

### GitHub
- **Auth**: OAuth2 (PKCE)
- **Actions**: Repositories, Issues, Pull Requests, Commits, Webhooks
- **Permissions**: `github.repositories.read/write`, `github.issues.read/write`, `github.pull_requests.read/write`

### Google Workspace
- **Auth**: OAuth2 (PKCE)
- **Actions**: Gmail, Drive, Calendar, Sheets, Docs
- **Permissions**: `google.gmail.read/send`, `google.drive.read/write`, `google.calendar.read/write`

### Microsoft 365
- **Auth**: OAuth2 (PKCE)
- **Actions**: Outlook, OneDrive, Calendar, Teams
- **Permissions**: `microsoft.mail.read/send`, `microsoft.drive.read/write`, `microsoft.calendar.read/write`

### Slack
- **Auth**: OAuth2
- **Actions**: Messages, Channels, Users
- **Permissions**: `slack.messages.read/write`, `slack.channels.read/write`, `slack.users.read`

### Discord
- **Auth**: OAuth2 (PKCE)
- **Actions**: Messages, Servers, Channels
- **Permissions**: `discord.messages.read/write`, `discord.servers.read`, `discord.channels.read/write`

### Notion
- **Auth**: OAuth2
- **Actions**: Pages, Databases, Search
- **Permissions**: `notion.pages.read/write`, `notion.databases.read/write`

### Stripe
- **Auth**: API Key (Bearer)
- **Actions**: Customers, Products, Subscriptions, Payments
- **Permissions**: `stripe.customers.read`, `stripe.products.read`, `stripe.subscriptions.read`, `stripe.payments.read`

### GitLab
- **Auth**: OAuth2 (PKCE)
- **Actions**: Projects, Issues, Merge Requests, CI/CD
- **Permissions**: `gitlab.projects.read/write`, `gitlab.issues.read/write`, `gitlab.merge_requests.read/write`

### Linear
- **Auth**: API Key (Bearer)
- **Actions**: Issues, Projects, Teams
- **Permissions**: `linear.issues.read/write`, `linear.projects.read/write`, `linear.teams.read/write`

### Jira
- **Auth**: Basic Auth (Email + API Token)
- **Actions**: Issues, Projects, Users
- **Permissions**: `jira.issues.read/write`, `jira.projects.read/write`, `jira.users.read`

### Supabase
- **Auth**: API Key (Bearer)
- **Actions**: Database (REST), Storage, Edge Functions
- **Permissions**: `supabase.database.read/write`, `supabase.storage.read/write`, `supabase.functions.invoke`

### Generic Connectors

#### Generic REST
- **Auth**: API Key / Bearer / None
- **Actions**: GET, POST, PUT, PATCH, DELETE with custom headers/params

#### Generic GraphQL
- **Auth**: API Key / Bearer / None
- **Actions**: Queries, Mutations with variables

#### Generic Webhook
- **Auth**: None (incoming)
- **Actions**: Receive and verify webhooks

## OAuth2 Flow

```
1. User initiates connection
2. System generates PKCE code verifier/challenge
3. Redirect to provider authorization URL
4. User authorizes
5. Provider redirects with code
6. Exchange code for tokens (with code_verifier)
7. Store encrypted tokens
8. Return success
```

### PKCE Support

All OAuth2 connectors support PKCE (Proof Key for Code Exchange):
- Generates cryptographically random code_verifier
- Derives code_challenge using SHA-256
- Prevents authorization code interception

## Token Management

- Automatic token refresh before expiration (5 min threshold)
- Encrypted storage using AES-GCM
- Refresh retry with exponential backoff (3 attempts)
- Scheduled background refresh

## Rate Limiting

Per-connector rate limits:
- GitHub: 5000/hr
- Google: 100/min
- Microsoft: 10000/min
- Slack: 100/min
- Discord: 50/sec
- Notion: 3/sec
- Stripe: 100/sec
- Linear: 500/min
- Jira: 100/min
- Supabase: 1000/min

## Webhook Handling

Each connector can register a webhook handler:

```typescript
interface WebhookHandler {
    verify(payload: string, signature: string): Promise<boolean>;
    handle(event: WebhookEvent): Promise<WebhookResult>;
}
```

Supported webhook verification:
- GitHub: HMAC-SHA256 (X-Hub-Signature-256)
- Stripe: HMAC-SHA256 (Stripe-Signature)
- Slack: HMAC-SHA256 (X-Slack-Signature)
- Discord: Ed25519 (X-Signature-Ed25519)

## Usage

```typescript
import { connectorV2 } from './connector-v2/index.ts';

// List available connectors
const connectors = connectorV2.registry.listEnabledConnectors();

// Create connection
const connection = await connectorV2.manager.createConnection(
    userId,
    'github',
    'My GitHub',
    { accessToken: '...', refreshToken: '...' }
);

// Execute action
const result = await connectorV2.manager.executeAction(
    connection.id,
    'getRepositories',
    { type: 'owner', sort: 'updated' }
);

// Test connection
const test = await connectorV2.manager.testConnection(connection.id);
```

## Adding a New Connector

1. Create connector config in `connector-v2/connectors/<name>/index.ts`
2. Create client in `connector-v2/connectors/<name>/client.ts`
3. Define types in `connector-v2/connectors/<name>/types.ts`
4. Register in `connector-v2/index.ts` `registerBuiltinConnectors()`

## Connector Permissions

Fine-grained permissions per connection:

```typescript
// Grant additional permission
await connectorV2.permissions.grantConnectionPermission(
    userId,
    connectionId,
    'github.repositories.write'
);

// Check permission
const allowed = await connectorV2.permissions.checkConnectionPermission(
    userId,
    connectionId,
    'github.issues.write'
);
```
export interface ApiKeyConfig {
    enabled: boolean;
    prefix: string;
    defaultExpiryDays: number;
    maxKeysPerUser: number;
}

export interface ApiKeyData {
    id: string;
    userId: string;
    name: string;
    prefix: string;
    keyHash: string;
    scopes: string[];
    expiresAt?: string;
    lastUsedAt?: string;
    revoked: boolean;
    revokedAt?: string;
    revokedBy?: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateApiKeyRequest {
    name: string;
    scopes: string[];
    expiresInDays?: number;
}

export interface CreateApiKeyResponse {
    id: string;
    name: string;
    prefix: string;
    key: string;
    scopes: string[];
    expiresAt?: string;
    createdAt: string;
}

export interface ApiKeyScope {
    name: string;
    description: string;
    resource: string;
    action: string;
}

export const API_KEY_SCOPES: ApiKeyScope[] = [
    { name: 'connector.read', description: 'Read connector connections', resource: 'connector', action: 'read' },
    { name: 'connector.create', description: 'Create connector connections', resource: 'connector', action: 'create' },
    { name: 'connector.update', description: 'Update connector connections', resource: 'connector', action: 'update' },
    { name: 'connector.delete', description: 'Delete connector connections', resource: 'connector', action: 'delete' },
    { name: 'github.repositories.read', description: 'Read GitHub repositories', resource: 'github.repositories', action: 'read' },
    { name: 'github.repositories.write', description: 'Write GitHub repositories', resource: 'github.repositories', action: 'write' },
    { name: 'github.issues.read', description: 'Read GitHub issues', resource: 'github.issues', action: 'read' },
    { name: 'github.issues.write', description: 'Write GitHub issues', resource: 'github.issues', action: 'write' },
    { name: 'google.gmail.read', description: 'Read Gmail', resource: 'google.gmail', action: 'read' },
    { name: 'google.gmail.send', description: 'Send Gmail', resource: 'google.gmail', action: 'send' },
    { name: 'google.drive.read', description: 'Read Google Drive', resource: 'google.drive', action: 'read' },
    { name: 'google.drive.write', description: 'Write Google Drive', resource: 'google.drive', action: 'write' },
    { name: 'ai.chat', description: 'AI chat completion', resource: 'ai', action: 'chat' },
    { name: 'ai.completion', description: 'AI text completion', resource: 'ai', action: 'completion' },
    { name: 'ai.embeddings', description: 'AI embeddings', resource: 'ai', action: 'embeddings' },
    { name: 'admin.users.read', description: 'Read admin users', resource: 'admin.users', action: 'read' },
];
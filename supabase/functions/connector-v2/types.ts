export type ConnectorAuthType = 'oauth2' | 'api_key' | 'bearer_token' | 'basic' | 'none';

export type ConnectorStatus = 'pending' | 'active' | 'error' | 'revoked' | 'expired';

export interface ConnectorConfig {
    id: string;
    name: string;
    displayName: string;
    description: string;
    category: string;
    version: string;
    authType: ConnectorAuthType;
    oauth2?: OAuth2Config;
    apiKey?: ApiKeyConfig;
    baseUrl: string;
    endpoints: ConnectorEndpoints;
    rateLimits?: RateLimitConfig;
    requiredPermissions: string[];
    optionalPermissions: string[];
    enabled: boolean;
    metadata?: Record<string, unknown>;
}

export interface OAuth2Config {
    authorizationUrl: string;
    tokenUrl: string;
    clientId: string;
    clientSecret: string;
    scopes: string[];
    redirectUri: string;
    pkce?: boolean;
    state?: string;
}

export interface ApiKeyConfig {
    headerName: string;
    prefix?: string;
    queryParam?: string;
}

export interface ConnectorEndpoints {
    [key: string]: EndpointConfig;
}

export interface EndpointConfig {
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    path: string;
    description?: string;
    parameters?: ParameterConfig[];
    requestBody?: RequestBodyConfig;
    responses?: ResponseConfig[];
    authRequired?: boolean;
    requiredPermissions?: string[];
    rateLimit?: RateLimitConfig;
}

export interface ParameterConfig {
    name: string;
    in: 'path' | 'query' | 'header' | 'cookie';
    required: boolean;
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    description?: string;
    enum?: string[];
    default?: unknown;
}

export interface RequestBodyConfig {
    contentType: 'application/json' | 'multipart/form-data' | 'application/x-www-form-urlencoded' | 'text/plain';
    schema?: Record<string, unknown>;
    required?: boolean;
    description?: string;
}

export interface ResponseConfig {
    statusCode: number;
    description: string;
    contentType?: string;
    schema?: Record<string, unknown>;
}

export interface RateLimitConfig {
    requests: number;
    windowMs: number;
    burst?: number;
}

export interface ConnectorConnection {
    id: string;
    userId: string;
    connectorId: string;
    name: string;
    status: ConnectorStatus;
    authType: ConnectorAuthType;
    config: Record<string, unknown>;
    credentials: ConnectorCredentials;
    permissions: string[];
    lastUsedAt?: string;
    lastError?: string;
    errorCount: number;
    expiresAt?: string;
    metadata: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
}

export interface ConnectorCredentials {
    accessToken?: string;
    refreshToken?: string;
    apiKey?: string;
    expiresAt?: number;
    tokenType?: string;
    scope?: string;
    custom?: Record<string, unknown>;
}

export interface ConnectorActionResult {
    success: boolean;
    data?: unknown;
    error?: ConnectorError;
    metadata?: Record<string, unknown>;
}

export interface ConnectorError {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    retryable?: boolean;
    statusCode?: number;
}

export interface OAuthState {
    state: string;
    codeVerifier?: string;
    redirectUri: string;
    connectorId: string;
    userId: string;
    scopes: string[];
    createdAt: number;
    expiresAt: number;
}

export interface TokenData {
    accessToken: string;
    refreshToken?: string;
    expiresAt: number;
    tokenType: string;
    scope?: string;
}

export interface RateLimitInfo {
    remaining: number;
    resetAt: number;
    limit: number;
}

export interface PaginationParams {
    page?: number;
    limit?: number;
    cursor?: string;
    offset?: number;
}

export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total?: number;
        hasMore: boolean;
        nextCursor?: string;
        nextPage?: number;
    };
}

export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: ConnectorError;
    meta?: Record<string, unknown>;
}
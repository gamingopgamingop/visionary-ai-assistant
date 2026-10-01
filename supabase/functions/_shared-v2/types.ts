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

export type ProviderType = 
    | 'openai' 
    | 'anthropic' 
    | 'gemini' 
    | 'huggingface' 
    | 'nvidia' 
    | 'ollama' 
    | 'vllm' 
    | 'openai_compatible';

export type ModelCapability = 
    | 'chat' 
    | 'completion' 
    | 'embeddings' 
    | 'images' 
    | 'audio' 
    | 'video' 
    | 'code' 
    | 'reasoning';

export type ModelStatus = 'active' | 'deprecated' | 'disabled';
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

export interface ProviderConfig {
    id: string;
    name: string;
    displayName: string;
    type: ProviderType;
    baseUrl?: string;
    apiKeyEnv?: string;
    apiKey?: string;
    enabled: boolean;
    priority: number;
    healthCheckUrl?: string;
    healthCheckIntervalMs: number;
    config: Record<string, unknown>;
    rateLimits?: RateLimitConfig;
    supportedModels: string[];
}

export interface ModelConfig {
    id: string;
    providerId: string;
    modelId: string;
    displayName: string;
    capabilities: ModelCapability[];
    contextLength: number;
    maxOutputTokens?: number;
    inputCostPer1kTokens?: number;
    outputCostPer1kTokens?: number;
    status: ModelStatus;
    priority: number;
    healthStatus: HealthStatus;
    lastHealthCheck?: string;
    config: Record<string, unknown>;
}

export interface ChatRequest {
    model: string;
    messages: ChatMessage[];
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    stop?: string | string[];
    stream?: boolean;
    tools?: ChatTool[];
    toolChoice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
    user?: string;
    metadata?: Record<string, unknown>;
}

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string | ChatMessageContent[];
    name?: string;
    toolCallId?: string;
    toolCalls?: ChatToolCall[];
}

export interface ChatMessageContent {
    type: 'text' | 'image_url' | 'audio';
    text?: string;
    imageUrl?: { url: string; detail?: 'low' | 'high' | 'auto' };
    audio?: { data: string; format: string };
}

export interface ChatTool {
    type: 'function';
    function: {
        name: string;
        description: string;
        parameters: Record<string, unknown>;
    };
}

export interface ChatToolCall {
    id: string;
    type: 'function';
    function: {
        name: string;
        arguments: string;
    };
}

export interface ChatResponse {
    id: string;
    model: string;
    choices: ChatChoice[];
    usage: ChatUsage;
    created: number;
    object: 'chat.completion';
}

export interface ChatChoice {
    index: number;
    message: ChatMessage;
    finishReason: 'stop' | 'length' | 'tool_calls' | 'content_filter';
}

export interface ChatUsage {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
}

export interface EmbeddingRequest {
    model: string;
    input: string | string[];
    encodingFormat?: 'float' | 'base64';
    dimensions?: number;
    user?: string;
}

export interface EmbeddingResponse {
    object: 'list';
    data: EmbeddingData[];
    model: string;
    usage: EmbeddingUsage;
}

export interface EmbeddingData {
    object: 'embedding';
    embedding: number[];
    index: number;
}

export interface EmbeddingUsage {
    promptTokens: number;
    totalTokens: number;
}

export interface ImageRequest {
    model: string;
    prompt: string;
    n?: number;
    size?: '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792';
    quality?: 'standard' | 'hd';
    style?: 'vivid' | 'natural';
    responseFormat?: 'url' | 'b64_json';
    user?: string;
}

export interface ImageResponse {
    created: number;
    data: ImageData[];
}

export interface ImageData {
    url?: string;
    b64Json?: string;
    revisedPrompt?: string;
}

export interface ProviderHealth {
    providerId: string;
    status: HealthStatus;
    latencyMs?: number;
    error?: string;
    lastCheck: string;
    details?: Record<string, unknown>;
}

export interface ModelHealth {
    modelId: string;
    providerId: string;
    status: HealthStatus;
    latencyMs?: number;
    error?: string;
    lastCheck: string;
}

export interface QuotaCheckResult {
    allowed: boolean;
    remaining: number;
    limit: number;
    resetAt: number;
    resourceType: string;
}

export interface UsageRecord {
    userId: string;
    providerId: string;
    modelId: string;
    resourceType: 'requests' | 'tokens' | 'images';
    quantity: number;
    metadata?: Record<string, unknown>;
    timestamp: string;
}

export interface AuditAction =
    | 'LOGIN_SUCCESS'
    | 'LOGIN_FAILED'
    | 'LOGOUT'
    | 'SESSION_REVOKED'
    | 'PASSWORD_CHANGED'
    | 'MFA_ENABLED'
    | 'MFA_DISABLED'
    | 'DEVICE_ADDED'
    | 'DEVICE_REVOKED'
    | 'ROLE_CHANGED'
    | 'PERMISSION_CHANGED'
    | 'API_KEY_CREATED'
    | 'API_KEY_REVOKED'
    | 'API_KEY_ROTATED'
    | 'CONNECTOR_CREATED'
    | 'CONNECTOR_UPDATED'
    | 'CONNECTOR_REVOKED'
    | 'CONNECTOR_TOKEN_REFRESHED'
    | 'AI_REQUEST'
    | 'AI_QUOTA_EXCEEDED'
    | 'ADMIN_ACTION';

export interface AuditLogEntry {
    id: string;
    userId?: string;
    action: AuditAction;
    resourceType?: string;
    resourceId?: string;
    success: boolean;
    ipAddress?: string;
    userAgent?: string;
    metadata: Record<string, unknown>;
    createdAt: string;
}

export interface JobType =
    | 'connector_sync'
    | 'webhook_process'
    | 'token_refresh'
    | 'ai_background_task'
    | 'document_processing'
    | 'indexing'
    | 'analytics'
    | 'cleanup';

export interface JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'retrying';

export interface BackgroundJob {
    id: string;
    userId?: string;
    jobType: JobType;
    status: JobStatus;
    payload: Record<string, unknown>;
    result?: Record<string, unknown>;
    error?: string;
    attempts: number;
    maxAttempts: number;
    priority: number;
    scheduledAt: string;
    startedAt?: string;
    completedAt?: string;
    nextRetryAt?: string;
    createdAt: string;
    updatedAt: string;
}
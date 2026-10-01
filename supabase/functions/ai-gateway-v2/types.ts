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

export interface AiGatewayConfig {
    enabled: boolean;
    defaultTimeoutMs: number;
    maxRetries: number;
    fallbackEnabled: boolean;
    healthCheckIntervalMs: number;
}

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

export interface RateLimitConfig {
    requestsPerMinute: number;
    requestsPerHour: number;
    tokensPerMinute: number;
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

export interface CompletionRequest {
    model: string;
    prompt: string;
    maxTokens?: number;
    temperature?: number;
    topP?: number;
    stop?: string | string[];
    stream?: boolean;
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
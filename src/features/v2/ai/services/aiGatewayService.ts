import { apiClient } from '../../shared/services/apiClient';
import { ApiResponse, PaginatedResponse, PaginationParams } from '../../shared/types';

export interface ProviderConfig {
  id: string;
  name: string;
  displayName: string;
  type: string;
  baseUrl?: string;
  apiKeyEnv?: string;
  enabled: boolean;
  priority: number;
  healthCheckUrl?: string;
  healthCheckIntervalMs: number;
  config: Record<string, unknown>;
  rateLimits?: any;
  supportedModels: string[];
}

export interface ModelConfig {
  id: string;
  providerId: string;
  modelId: string;
  displayName: string;
  capabilities: string[];
  contextLength: number;
  maxOutputTokens?: number;
  inputCostPer1kTokens?: number;
  outputCostPer1kTokens?: number;
  status: string;
  priority: number;
  healthStatus: string;
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
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  latencyMs?: number;
  error?: string;
  lastCheck: string;
  details?: Record<string, unknown>;
}

export interface ModelHealth {
  modelId: string;
  providerId: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
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

export class AiGatewayServiceV2 {
  // Providers
  async listProviders(enabledOnly = false): Promise<ApiResponse<ProviderConfig[]>> {
    return apiClient.get<ProviderConfig[]>('/ai-gateway-v2/providers', { enabled: enabledOnly });
  }

  async getProvider(providerId: string): Promise<ApiResponse<ProviderConfig>> {
    return apiClient.get<ProviderConfig>(`/ai-gateway-v2/providers/${providerId}`);
  }

  async createProvider(config: Omit<ProviderConfig, 'id'>): Promise<ApiResponse<ProviderConfig>> {
    return apiClient.post<ProviderConfig>('/ai-gateway-v2/providers', config);
  }

  async updateProvider(providerId: string, updates: Partial<ProviderConfig>): Promise<ApiResponse<void>> {
    return apiClient.patch<void>(`/ai-gateway-v2/providers/${providerId}`, updates);
  }

  async deleteProvider(providerId: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/ai-gateway-v2/providers/${providerId}`);
  }

  async getProviderApiKey(providerId: string): Promise<ApiResponse<string | null>> {
    return apiClient.get<string | null>(`/ai-gateway-v2/providers/${providerId}/api-key`);
  }

  async getEnabledProvidersByType(type: string): Promise<ApiResponse<ProviderConfig[]>> {
    return apiClient.get<ProviderConfig[]>(`/ai-gateway-v2/providers`, { type, enabled: true });
  }

  async getProvidersForModel(modelId: string): Promise<ApiResponse<ProviderConfig[]>> {
    return apiClient.get<ProviderConfig[]>(`/ai-gateway-v2/models/${modelId}/providers`);
  }

  // Models
  async listModels(filters?: { providerId?: string; status?: string; capability?: string }): Promise<ApiResponse<ModelConfig[]>> {
    return apiClient.get<ModelConfig[]>('/ai-gateway-v2/models', filters);
  }

  async getModel(modelId: string): Promise<ApiResponse<ModelConfig>> {
    return apiClient.get<ModelConfig>(`/ai-gateway-v2/models/${modelId}`);
  }

  async getModelByProviderAndId(providerId: string, modelId: string): Promise<ApiResponse<ModelConfig>> {
    return apiClient.get<ModelConfig>(`/ai-gateway-v2/providers/${providerId}/models/${modelId}`);
  }

  async createModel(config: Omit<ModelConfig, 'id'>): Promise<ApiResponse<ModelConfig>> {
    return apiClient.post<ModelConfig>('/ai-gateway-v2/models', config);
  }

  async updateModel(modelId: string, updates: Partial<ModelConfig>): Promise<ApiResponse<void>> {
    return apiClient.patch<void>(`/ai-gateway-v2/models/${modelId}`, updates);
  }

  async deleteModel(modelId: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/ai-gateway-v2/models/${modelId}`);
  }

  async getModelsForCapability(capability: string): Promise<ApiResponse<ModelConfig[]>> {
    return apiClient.get<ModelConfig[]>(`/ai-gateway-v2/models`, { capability });
  }

  async getBestModelForCapability(capability: string, providerPriority?: string[]): Promise<ApiResponse<ModelConfig | null>> {
    return apiClient.get<ModelConfig | null>(`/ai-gateway-v2/models/best`, { capability, providerPriority: providerPriority?.join(',') });
  }

  async updateModelHealth(modelId: string, healthStatus: string, latencyMs?: number, error?: string): Promise<ApiResponse<void>> {
    return apiClient.patch<void>(`/ai-gateway-v2/models/${modelId}/health`, { healthStatus, latencyMs, error });
  }

  // Health
  async checkProviderHealth(providerId: string): Promise<ApiResponse<ProviderHealth>> {
    return apiClient.get<ProviderHealth>(`/ai-gateway-v2/health/providers/${providerId}`);
  }

  async checkModelHealth(modelId: string): Promise<ApiResponse<ModelHealth>> {
    return apiClient.get<ModelHealth>(`/ai-gateway-v2/health/models/${modelId}`);
  }

  async runHealthChecks(): Promise<ApiResponse<{ providers: ProviderHealth[]; models: ModelHealth[] }>> {
    return apiClient.post('/ai-gateway-v2/health/check');
  }

  async getProviderHealthStatus(providerId: string): Promise<ApiResponse<ProviderHealth | null>> {
    return apiClient.get<ProviderHealth | null>(`/ai-gateway-v2/health/providers/${providerId}/status`);
  }

  async getModelHealthStatus(modelId: string): Promise<ApiResponse<ModelHealth | null>> {
    return apiClient.get<ModelHealth | null>(`/ai-gateway-v2/health/models/${modelId}/status`);
  }

  async getOverallHealth(): Promise<ApiResponse<{ status: string; checks: ProviderHealth[]; timestamp: number }>> {
    return apiClient.get('/ai-gateway-v2/health');
  }

  // Chat Completions
  async chatCompletion(request: ChatRequest): Promise<ApiResponse<ChatResponse>> {
    return apiClient.post<ChatResponse>('/ai-gateway-v2/chat/completions', request);
  }

  async chatCompletionStream(request: ChatRequest): Promise<ReadableStream<ChatResponse> | null> {
    const response = await fetch('/v2/ai-gateway-v2/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ ...request, stream: true }),
    });
    return response.body;
  }

  // Embeddings
  async createEmbeddings(request: EmbeddingRequest): Promise<ApiResponse<EmbeddingResponse>> {
    return apiClient.post<EmbeddingResponse>('/ai-gateway-v2/embeddings', request);
  }

  // Images
  async generateImage(request: ImageRequest): Promise<ApiResponse<ImageResponse>> {
    return apiClient.post<ImageResponse>('/ai-gateway-v2/images/generate', request);
  }

  // Quotas
  async checkQuota(userId: string, resourceType: string, quantity?: number): Promise<ApiResponse<QuotaCheckResult>> {
    return apiClient.post<QuotaCheckResult>('/ai-gateway-v2/quotas/check', { userId, resourceType, quantity });
  }

  async getQuota(userId: string, resourceType: string): Promise<ApiResponse<QuotaCheckResult | null>> {
    return apiClient.get<QuotaCheckResult | null>(`/ai-gateway-v2/quotas/${userId}/${resourceType}`);
  }

  async getAllQuotas(userId: string): Promise<ApiResponse<QuotaCheckResult[]>> {
    return apiClient.get<QuotaCheckResult[]>(`/ai-gateway-v2/quotas/${userId}`);
  }

  async resetQuota(userId: string, resourceType: string): Promise<ApiResponse<void>> {
    return apiClient.post<void>(`/ai-gateway-v2/quotas/${userId}/${resourceType}/reset`);
  }

  async initializeUserQuotas(userId: string, planType: string): Promise<ApiResponse<void>> {
    return apiClient.post<void>(`/ai-gateway-v2/quotas/initialize`, { userId, planType });
  }

  async upgradeUserPlan(userId: string, newPlanType: string): Promise<ApiResponse<void>> {
    return apiClient.post<void>(`/ai-gateway-v2/quotas/upgrade`, { userId, newPlanType });
  }

  // Usage
  async recordUsage(record: UsageRecord): Promise<ApiResponse<void>> {
    return apiClient.post<void>('/ai-gateway-v2/usage', record);
  }

  async recordAIUsage(userId: string, providerId: string, modelId: string, resourceType: 'requests' | 'tokens' | 'images', quantity: number, metadata?: Record<string, unknown>): Promise<ApiResponse<void>> {
    return apiClient.post<void>('/ai-gateway-v2/usage/ai', { userId, providerId, modelId, resourceType, quantity, metadata });
  }

  async getUsage(userId: string, resourceType?: string, startDate?: string, endDate?: string, limit?: number): Promise<ApiResponse<UsageRecord[]>> {
    return apiClient.get<UsageRecord[]>(`/ai-gateway-v2/usage/${userId}`, { resourceType, startDate, endDate, limit });
  }

  async getUsageSummary(userId: string, startDate?: string, endDate?: string): Promise<ApiResponse<Record<string, number>>> {
    return apiClient.get<Record<string, number>>(`/ai-gateway-v2/usage/${userId}/summary`, { startDate, endDate });
  }

  async getUsageByModel(userId: string, startDate?: string, endDate?: string): Promise<ApiResponse<Record<string, Record<string, number>>>> {
    return apiClient.get(`/ai-gateway-v2/usage/${userId}/by-model`, { startDate, endDate });
  }

  async getUsageByProvider(userId: string, startDate?: string, endDate?: string): Promise<ApiResponse<Record<string, Record<string, number>>>> {
    return apiClient.get(`/ai-gateway-v2/usage/${userId}/by-provider`, { startDate, endDate });
  }

  async getDailyUsage(userId: string, days?: number): Promise<ApiResponse<Record<string, Record<string, number>>>> {
    return apiClient.get(`/ai-gateway-v2/usage/${userId}/daily`, { days });
  }
}

export const aiGatewayServiceV2 = new AiGatewayServiceV2();
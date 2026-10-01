# AI Gateway v2

## Overview

The AI Gateway provides a unified interface for accessing multiple AI providers with intelligent routing, fallback, quotas, and observability.

## Architecture

```
Request → Auth → AuthZ → Quota → Rate Limit →
Model Router → Provider Health → Provider →
Model → Usage Recording → Response
```

## Provider Abstraction

The gateway supports multiple provider types:

| Type | Examples |
|------|----------|
| `openai` | OpenAI, Azure OpenAI |
| `anthropic` | Anthropic Claude |
| `gemini` | Google Gemini |
| `huggingface` | Hugging Face Inference API |
| `nvidia` | NVIDIA NIM |
| `ollama` | Local Ollama |
| `vllm` | vLLM servers |
| `openai_compatible` | Any OpenAI-compatible endpoint |

## Model Registry

Models are registered with capabilities and metadata:

```typescript
interface ModelConfig {
    id: string;
    providerId: string;
    modelId: string;           // Provider's model identifier
    displayName: string;       // Human-readable name
    capabilities: ModelCapability[];
    contextLength: number;     // Max context tokens
    maxOutputTokens?: number;
    inputCostPer1kTokens?: number;
    outputCostPer1kTokens?: number;
    status: 'active' | 'deprecated' | 'disabled';
    priority: number;          // Routing priority
    healthStatus: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
}
```

### Capabilities

- `chat` - Chat completions
- `completion` - Text completions
- `embeddings` - Vector embeddings
- `images` - Image generation
- `audio` - Audio processing
- `video` - Video generation
- `code` - Code generation
- `reasoning` - Reasoning models

## Multi-Provider Model Routing

Multiple providers can expose the same model with automatic fallback:

```
Nemotron 3 Ultra
    ↓ (priority 100)
NVIDIA NIM
    ↓ (priority 80)
vLLM (self-hosted)
    ↓ (priority 60)
Fireworks AI
    ↓ (priority 40)
Together AI
    ↓ (priority 20)
Generic OpenAI-compatible
```

### Routing Logic

1. Find all providers offering the requested model
2. Filter by health status (healthy only)
3. Sort by priority (highest first)
4. Try primary provider
5. On failure, apply fallback policy
6. Record usage per provider

## Fallback Policy

```typescript
interface FallbackConfig {
    enabled: boolean;
    maxRetries: number;           // Total attempts across providers
    retryDelayMs: number;         // Base delay
    exponentialBackoff: boolean;  // 2x backoff
    fallbackProviders: string[];  // Ordered fallback list
}
```

## Health Checks

- **Provider Health**: Periodic checks of provider endpoints
- **Model Health**: Per-model availability checks
- **Circuit Breakers**: Per-provider failure tracking
- **Automatic Recovery**: Health restored → circuit closed

### Health Check Intervals

- External providers: 60 seconds
- Local providers (Ollama, vLLM): 30 seconds

## Quotas

Per-user quotas by resource type:

| Resource | Free | Pro | Business | Enterprise |
|----------|------|-----|----------|------------|
| AI Requests/day | 100 | 1,000 | 10,000 | 100,000 |
| AI Tokens/day | 50K | 1M | 10M | 100M |
| Images/day | 10 | 100 | 1,000 | 10,000 |
| Connector calls/day | 100 | 1,000 | 10,000 | 100,000 |
| API calls/day | 1,000 | 10,000 | 100,000 | 1M |
| Storage/month | 100MB | 10GB | 100GB | 1TB |
| Background jobs/day | 10 | 100 | 1,000 | 10,000 |

### Plan Types

- `free` - Default for new users
- `pro` - Paid tier
- `business` - Team tier
- `enterprise` - Custom limits

## Rate Limiting

Multi-dimensional rate limiting:

- Per user
- Per API key
- Per connector
- Per model
- Per endpoint
- Per IP
- Global

## Supported APIs

### Chat Completions

```typescript
POST /ai-gateway-v2/chat
{
    "model": "nemotron-3-ultra",
    "messages": [
        { "role": "user", "content": "Hello!" }
    ],
    "temperature": 0.7,
    "maxTokens": 1000,
    "stream": false
}
```

### Embeddings

```typescript
POST /ai-gateway-v2/embeddings
{
    "model": "text-embedding-3-large",
    "input": "Hello world",
    "encodingFormat": "float"
}
```

### Image Generation

```typescript
POST /ai-gateway-v2/images
{
    "model": "dall-e-3",
    "prompt": "A beautiful sunset",
    "n": 1,
    "size": "1024x1024",
    "quality": "hd"
}
```

## Usage Tracking

All requests recorded to `usage_records` table:

```typescript
{
    userId: string,
    providerId: string,
    modelId: string,
    resourceType: 'requests' | 'tokens' | 'images',
    quantity: number,
    metadata: Record<string, unknown>,
    timestamp: string
}
```

## Provider Configuration

```typescript
{
    "id": "uuid",
    "name": "nvidia",
    "displayName": "NVIDIA",
    "type": "nvidia",
    "baseUrl": "https://integrate.api.nvidia.com/v1",
    "apiKeyEnv": "NVIDIA_API_KEY",
    "enabled": true,
    "priority": 100,
    "healthCheckUrl": "https://integrate.api.nvidia.com/v1/models",
    "healthCheckIntervalMs": 60000,
    "supportedModels": ["nemotron-3-ultra"]
}
```

## Model Configuration

```typescript
{
    "id": "uuid",
    "providerId": "provider-uuid",
    "modelId": "nemotron-3-ultra",
    "displayName": "Nemotron 3 Ultra",
    "capabilities": ["chat", "completion", "reasoning"],
    "contextLength": 128000,
    "maxOutputTokens": 4096,
    "inputCostPer1kTokens": 0.0001,
    "outputCostPer1kTokens": 0.0002,
    "status": "active",
    "priority": 100,
    "healthStatus": "healthy"
}
```

## Circuit Breakers

Per-provider circuit breakers prevent cascade failures:

```typescript
{
    failureThreshold: 5,
    resetTimeoutMs: 60000,
    // States: closed → open → half-open → closed
}
```

## Error Handling

- Retryable errors: timeout, network, 5xx, rate limit
- Non-retryable: 4xx (except 429), auth errors
- Exponential backoff with jitter
- Max 3 attempts per provider

## Observability

- Request/response logging
- Latency metrics (p50, p95, p99)
- Token usage tracking
- Cost estimation
- Provider health status
- Quota utilization

## Adding a New Provider

1. Add provider to `ai_providers` table
2. Add models to `ai_models` table
3. Configure health check endpoint
4. Test with `/health/check` endpoint
5. Enable in routing
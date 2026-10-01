import { createClient } from '@supabase/supabase-js';
import { authenticateRequest, requireAuth } from '../../auth/middleware.ts';
import { checkPermission } from '../../auth/authorization.ts';
import { logSecurityEvent } from '../../auth/security.ts';
import { rateLimiter } from '../connector-v2/rate-limit.ts';
import { 
    getProviders, 
    getProvider, 
    getModels, 
    getModel,
    getBestModelForCapability 
} from './providers.ts';
import { 
    checkQuota, 
    getAllQuotas 
} from './quotas.ts';
import { 
    recordAIUsage,
    getUsage,
    getUsageSummary 
} from './usage.ts';
import { 
    executeWithFallback,
    circuitBreakers 
} from './fallback.ts';
import { runHealthChecks } from './health.ts';

const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

function getCorsHeaders(origin?: string): Record<string, string> {
    return {
        'Access-Control-Allow-Origin': origin || '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
        'Access-Control-Max-Age': '86400',
    };
}

function handleCors(req: Request): Response | null {
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: getCorsHeaders(req.headers.get('Origin') || undefined),
        });
    }
    return null;
}

function jsonResponse(data: unknown, status: number = 200, origin?: string): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: { ...getCorsHeaders(origin), 'Content-Type': 'application/json' },
    });
}

function errorResponse(error: string, status: number = 400, origin?: string): Response {
    return jsonResponse({ success: false, error }, status, origin);
}

export async function handleAiGatewayV2Request(req: Request): Promise<Response> {
    const requestId = crypto.randomUUID();
    const origin = req.headers.get('Origin') || undefined;
    const corsHeaders = getCorsHeaders(origin);

    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const gatewayPathIndex = pathParts.findIndex(p => p === 'ai-gateway-v2');
    
    if (gatewayPathIndex === -1) {
        return errorResponse('Not found', 404, origin);
    }

    const parts = pathParts.slice(gatewayPathIndex + 1);

    if (Deno.env.get('NEW_AI_GATEWAY_ENABLED') !== 'true') {
        return errorResponse('AI Gateway is disabled', 503, origin);
    }

    try {
        await rateLimiter.checkGlobalLimit();

        if (parts.length === 0) {
            if (req.method === 'GET') {
                return jsonResponse({ success: true, data: { status: 'ok' } }, 200, origin);
            }
            return errorResponse('Method not allowed', 405, origin);
        }

        if (parts[0] === 'providers') {
            return await handleProvidersRoute(req, parts.slice(1), requestId, origin);
        }

        if (parts[0] === 'models') {
            return await handleModelsRoute(req, parts.slice(1), requestId, origin);
        }

        if (parts[0] === 'chat') {
            return await handleChatRoute(req, parts.slice(1), requestId, origin);
        }

        if (parts[0] === 'completions') {
            return await handleCompletionsRoute(req, parts.slice(1), requestId, origin);
        }

        if (parts[0] === 'embeddings') {
            return await handleEmbeddingsRoute(req, parts.slice(1), requestId, origin);
        }

        if (parts[0] === 'images') {
            return await handleImagesRoute(req, parts.slice(1), requestId, origin);
        }

        if (parts[0] === 'health') {
            return await handleHealthRoute(req, parts.slice(1), requestId, origin);
        }

        if (parts[0] === 'quotas') {
            return await handleQuotasRoute(req, parts.slice(1), requestId, origin);
        }

        if (parts[0] === 'usage') {
            return await handleUsageRoute(req, parts.slice(1), requestId, origin);
        }

        return errorResponse('Not found', 404, origin);
    } catch (error) {
        console.error('AI Gateway v2 request failed:', error);
        return errorResponse('Internal server error', 500, origin);
    }
}

async function handleProvidersRoute(
    req: Request,
    parts: string[],
    requestId: string,
    origin: string
): Promise<Response> {
    if (parts.length === 0) {
        if (req.method === 'GET') {
            const enabledOnly = new URL(req.url).searchParams.get('enabled') === 'true';
            const providers = await getProviders(enabledOnly);
            return jsonResponse({ success: true, data: providers }, 200, origin);
        }
        return errorResponse('Method not allowed', 405, origin);
    }

    const providerId = parts[0];

    if (req.method === 'GET') {
        const provider = await getProvider(providerId);
        if (!provider) {
            return errorResponse('Provider not found', 404, origin);
        }
        return jsonResponse({ success: true, data: provider }, 200, origin);
    }

    if (parts[1] === 'models' && req.method === 'GET') {
        const provider = await getProvider(providerId);
        if (!provider) {
            return errorResponse('Provider not found', 404, origin);
        }
        const models = await getModels({ providerId, status: 'active' });
        return jsonResponse({ success: true, data: models }, 200, origin);
    }

    return errorResponse('Not found', 404, origin);
}

async function handleModelsRoute(
    req: Request,
    parts: string[],
    requestId: string,
    origin: string
): Promise<Response> {
    if (parts.length === 0) {
        if (req.method === 'GET') {
            const url = new URL(req.url);
            const providerId = url.searchParams.get('provider');
            const capability = url.searchParams.get('capability');
            const status = url.searchParams.get('status');

            const models = await getModels({
                providerId: providerId || undefined,
                capability: capability as any,
                status: status as any,
            });
            return jsonResponse({ success: true, data: models }, 200, origin);
        }
        return errorResponse('Method not allowed', 405, origin);
    }

    if (parts[0] === 'best' && req.method === 'GET') {
        const url = new URL(req.url);
        const capability = url.searchParams.get('capability');
        
        if (!capability) {
            return errorResponse('Missing capability parameter', 400, origin);
        }

        const model = await getBestModelForCapability(capability as any);
        return jsonResponse({ success: true, data: model }, 200, origin);
    }

    const modelId = parts[0];

    if (req.method === 'GET') {
        const model = await getModel(modelId);
        if (!model) {
            return errorResponse('Model not found', 404, origin);
        }
        return jsonResponse({ success: true, data: model }, 200, origin);
    }

    return errorResponse('Not found', 404, origin);
}

async function handleChatRoute(
    req: Request,
    parts: string[],
    requestId: string,
    origin: string
): Promise<Response> {
    if (req.method !== 'POST') {
        return errorResponse('Method not allowed', 405, origin);
    }

    const user = await requireAuth(req);
    
    const hasPermission = await checkPermission(user, 'ai.chat');
    if (!hasPermission.allowed) {
        await logSecurityEvent('AI_REQUEST', {
            userId: user.id,
            success: false,
            metadata: { action: 'chat', error: 'permission_denied' },
        });
        return errorResponse('Permission denied: ai.chat', 403, origin);
    }

    const body = await req.json();
    const { model, ...chatRequest } = body;

    if (!model) {
        return errorResponse('Missing model parameter', 400, origin);
    }

    const quotaCheck = await checkQuota(user.id, 'ai_requests', 1);
    if (!quotaCheck.allowed) {
        await logSecurityEvent('AI_QUOTA_EXCEEDED', {
            userId: user.id,
            success: false,
            metadata: { action: 'chat', resourceType: 'ai_requests' },
        });
        return errorResponse('Quota exceeded for AI requests', 429, origin);
    }

    const tokenQuotaCheck = await checkQuota(user.id, 'ai_tokens', 1000);
    if (!tokenQuotaCheck.allowed) {
        return errorResponse('Token quota exceeded', 429, origin);
    }

    try {
        const result = await executeWithFallback(
            { model, ...chatRequest },
            async (provider, modelConfig) => {
                const apiKey = await getProviderApiKey(provider.id);
                if (!apiKey) {
                    throw new Error(`No API key configured for provider: ${provider.name}`);
                }

                const response = await fetch(`${provider.baseUrl}/chat/completions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`,
                    },
                    body: JSON.stringify({
                        model: modelConfig.modelId,
                        ...chatRequest,
                    }),
                });

                if (!response.ok) {
                    const error = await response.text();
                    throw new Error(`Provider error: ${response.status} ${error}`);
                }

                return response.json();
            },
            {
                enabled: true,
                maxRetries: 2,
                retryDelayMs: 1000,
                exponentialBackoff: true,
                fallbackProviders: [],
            }
        );

        await recordAIUsage(user.id, '', '', 'ai_requests', 1, { model, action: 'chat' });
        await recordAIUsage(user.id, '', '', 'ai_tokens', result.usage?.total_tokens || 0, { model, action: 'chat' });

        await logSecurityEvent('AI_REQUEST', {
            userId: user.id,
            success: true,
            metadata: { action: 'chat', model },
        });

        return jsonResponse({ success: true, data: result }, 200, origin);
    } catch (error) {
        await logSecurityEvent('AI_REQUEST', {
            userId: user.id,
            success: false,
            metadata: { action: 'chat', model, error: (error as Error).message },
        });
        return errorResponse((error as Error).message, 500, origin);
    }
}

async function handleCompletionsRoute(
    req: Request,
    parts: string[],
    requestId: string,
    origin: string
): Promise<Response> {
    if (req.method !== 'POST') {
        return errorResponse('Method not allowed', 405, origin);
    }

    const user = await requireAuth(req);
    const hasPermission = await checkPermission(user, 'ai.completion');
    if (!hasPermission.allowed) {
        return errorResponse('Permission denied: ai.completion', 403, origin);
    }

    const quotaCheck = await checkQuota(user.id, 'ai_requests', 1);
    if (!quotaCheck.allowed) {
        return errorResponse('Quota exceeded for AI requests', 429, origin);
    }

    return errorResponse('Not implemented', 501, origin);
}

async function handleEmbeddingsRoute(
    req: Request,
    parts: string[],
    requestId: string,
    origin: string
): Promise<Response> {
    if (req.method !== 'POST') {
        return errorResponse('Method not allowed', 405, origin);
    }

    const user = await requireAuth(req);
    const hasPermission = await checkPermission(user, 'ai.embeddings');
    if (!hasPermission.allowed) {
        return errorResponse('Permission denied: ai.embeddings', 403, origin);
    }

    const quotaCheck = await checkQuota(user.id, 'ai_requests', 1);
    if (!quotaCheck.allowed) {
        return errorResponse('Quota exceeded for AI requests', 429, origin);
    }

    return errorResponse('Not implemented', 501, origin);
}

async function handleImagesRoute(
    req: Request,
    parts: string[],
    requestId: string,
    origin: string
): Promise<Response> {
    if (req.method !== 'POST') {
        return errorResponse('Method not allowed', 405, origin);
    }

    const user = await requireAuth(req);
    const hasPermission = await checkPermission(user, 'ai.images');
    if (!hasPermission.allowed) {
        return errorResponse('Permission denied: ai.images', 403, origin);
    }

    const quotaCheck = await checkQuota(user.id, 'ai_images', 1);
    if (!quotaCheck.allowed) {
        return errorResponse('Image quota exceeded', 429, origin);
    }

    return errorResponse('Not implemented', 501, origin);
}

async function handleHealthRoute(
    req: Request,
    parts: string[],
    requestId: string,
    origin: string
): Promise<Response> {
    if (req.method !== 'GET') {
        return errorResponse('Method not allowed', 405, origin);
    }

    if (parts[0] === 'check' && req.method === 'POST') {
        const user = await requireAuth(req);
        const hasPermission = await checkPermission(user, 'admin.settings');
        if (!hasPermission.allowed) {
            return errorResponse('Permission denied', 403, origin);
        }

        const result = await runHealthChecks();
        return jsonResponse({ success: true, data: result }, 200, origin);
    }

    const providers = await getProviders(true);
    const models = await getModels({ status: 'active' });

    const healthyProviders = providers.filter(p => p.enabled).length;
    const healthyModels = models.filter(m => m.healthStatus === 'healthy').length;

    return jsonResponse({
        success: true,
        data: {
            status: 'healthy',
            providers: { total: providers.length, healthy: healthyProviders },
            models: { total: models.length, healthy: healthyModels },
        },
    }, 200, origin);
}

async function handleQuotasRoute(
    req: Request,
    parts: string[],
    requestId: string,
    origin: string
): Promise<Response> {
    const user = await requireAuth(req);

    if (parts.length === 0) {
        if (req.method === 'GET') {
            const quotas = await getAllQuotas(user.id);
            return jsonResponse({ success: true, data: quotas }, 200, origin);
        }
        return errorResponse('Method not allowed', 405, origin);
    }

    const resourceType = parts[0];

    if (req.method === 'GET') {
        const quota = await checkQuota(user.id, resourceType);
        return jsonResponse({ success: true, data: quota }, 200, origin);
    }

    return errorResponse('Not found', 404, origin);
}

async function handleUsageRoute(
    req: Request,
    parts: string[],
    requestId: string,
    origin: string
): Promise<Response> {
    const user = await requireAuth(req);

    if (parts.length === 0) {
        if (req.method === 'GET') {
            const url = new URL(req.url);
            const resourceType = url.searchParams.get('resource_type');
            const startDate = url.searchParams.get('start_date');
            const endDate = url.searchParams.get('end_date');

            const [summary, records] = await Promise.all([
                getUsageSummary(user.id, startDate || undefined, endDate || undefined),
                getUsage(user.id, resourceType || undefined, startDate || undefined, endDate || undefined),
            ]);

            return jsonResponse({ success: true, data: { summary, records } }, 200, origin);
        }
        return errorResponse('Method not allowed', 405, origin);
    }

    if (parts[0] === 'daily' && req.method === 'GET') {
        const url = new URL(req.url);
        const days = parseInt(url.searchParams.get('days') || '30', 10);
        const daily = await getDailyUsage(user.id, days);
        return jsonResponse({ success: true, data: daily }, 200, origin);
    }

    if (parts[0] === 'by-model' && req.method === 'GET') {
        const url = new URL(req.url);
        const startDate = url.searchParams.get('start_date');
        const endDate = url.searchParams.get('end_date');
        const byModel = await getUsageByModel(user.id, startDate || undefined, endDate || undefined);
        return jsonResponse({ success: true, data: byModel }, 200, origin);
    }

    if (parts[0] === 'by-provider' && req.method === 'GET') {
        const url = new URL(req.url);
        const startDate = url.searchParams.get('start_date');
        const endDate = url.searchParams.get('end_date');
        const byProvider = await getUsageByProvider(user.id, startDate || undefined, endDate || undefined);
        return jsonResponse({ success: true, data: byProvider }, 200, origin);
    }

    return errorResponse('Not found', 404, origin);
}
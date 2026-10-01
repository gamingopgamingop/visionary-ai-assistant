import { connectorV2 } from './index.ts';
import { createClient } from '@supabase/supabase-js';
import { authenticateRequest, requireAuth } from '../auth/middleware.ts';
import { checkPermission } from '../auth/authorization.ts';
import { logSecurityEvent } from '../auth/security.ts';
import { rateLimiter } from './rate-limit.ts';

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

export async function handleConnectorV2Request(req: Request): Promise<Response> {
    const requestId = crypto.randomUUID();
    const origin = req.headers.get('Origin') || undefined;
    const corsHeaders = getCorsHeaders(origin);

    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const connectorPathIndex = pathParts.findIndex(p => p === 'connector-v2');
    
    if (connectorPathIndex === -1) {
        return errorResponse('Not found', 404, origin);
    }

    const parts = pathParts.slice(connectorPathIndex + 1);

    if (Deno.env.get('NEW_CONNECTOR_ENGINE_ENABLED') !== 'true') {
        return errorResponse('New connector engine is disabled', 503, origin);
    }

    try {
        await rateLimiter.checkGlobalLimit();

        if (parts.length === 0) {
            if (req.method === 'GET') {
                const connectors = connectorV2.registry.listConnectors();
                return jsonResponse({ success: true, data: connectors }, 200, origin);
            }
            return errorResponse('Method not allowed', 405, origin);
        }

        if (parts[0] === 'connectors') {
            return await handleConnectorsRoute(req, parts.slice(1), requestId, origin);
        }

        if (parts[0] === 'oauth') {
            return await handleOAuthRoute(req, parts.slice(1), requestId, origin);
        }

        if (parts[0] === 'webhooks') {
            return await handleWebhooksRoute(req, parts.slice(1), requestId, origin);
        }

        return errorResponse('Not found', 404, origin);
    } catch (error) {
        console.error('Connector v2 request failed:', error);
        return errorResponse('Internal server error', 500, origin);
    }
}

async function handleConnectorsRoute(
    req: Request,
    parts: string[],
    requestId: string,
    origin: string
): Promise<Response> {
    if (parts.length === 0) {
        if (req.method === 'GET') {
            const connectors = connectorV2.registry.listEnabledConnectors();
            return jsonResponse({ success: true, data: connectors }, 200, origin);
        }
        return errorResponse('Method not allowed', 405, origin);
    }

    if (parts[0] === 'enabled' && req.method === 'GET') {
        const connectors = connectorV2.registry.listEnabledConnectors();
        return jsonResponse({ success: true, data: connectors }, 200, origin);
    }

    if (parts[0] === 'categories' && req.method === 'GET') {
        const connectors = connectorV2.registry.listConnectors();
        const categories = [...new Set(connectors.map(c => c.category))];
        return jsonResponse({ success: true, data: categories }, 200, origin);
    }

    const connectorId = parts[0];

    if (!connectorV2.registry.hasConnector(connectorId)) {
        return errorResponse('Connector not found', 404, origin);
    }

    if (!connectorV2.registry.isEnabled(connectorId)) {
        return errorResponse('Connector is disabled', 404, origin);
    }

    if (parts.length === 1) {
        if (req.method === 'GET') {
            const config = connectorV2.registry.getConfig(connectorId);
            return jsonResponse({ success: true, data: config }, 200, origin);
        }
        return errorResponse('Method not allowed', 405, origin);
    }

    if (parts[1] === 'config' && req.method === 'GET') {
        const config = connectorV2.registry.getConfig(connectorId);
        return jsonResponse({ success: true, data: config }, 200, origin);
    }

    if (parts[1] === 'endpoints' && req.method === 'GET') {
        const config = connectorV2.registry.getConfig(connectorId);
        return jsonResponse({ success: true, data: config.endpoints }, 200, origin);
    }

    if (parts[1] === 'required-permissions' && req.method === 'GET') {
        const config = connectorV2.registry.getConfig(connectorId);
        return jsonResponse({ success: true, data: config.requiredPermissions }, 200, origin);
    }

    return errorResponse('Not found', 404, origin);
}

async function handleOAuthRoute(
    req: Request,
    parts: string[],
    requestId: string,
    origin: string
): Promise<Response> {
    if (parts.length === 0) return errorResponse('Not found', 404, origin);

    if (parts[0] === 'authorize' && req.method === 'POST') {
        const user = await requireAuth(req);
        const body = await req.json();
        const { connectorId, redirectUri, scopes } = body;

        if (!connectorId || !redirectUri) {
            return errorResponse('Missing connectorId or redirectUri', 400, origin);
        }

        if (!connectorV2.registry.hasConnector(connectorId)) {
            return errorResponse('Connector not found', 404, origin);
        }

        const config = connectorV2.registry.getConfig(connectorId);
        const { authorizationUrl, state } = await connectorV2.oauth.initiateOAuthFlow(
            user.id,
            connectorId,
            config.auth,
            redirectUri,
            scopes
        );

        await logSecurityEvent('CONNECTOR_CREATED', {
            userId: user.id,
            success: true,
            ipAddress: req.headers.get('x-forwarded-for') || undefined,
            userAgent: req.headers.get('user-agent') || undefined,
            metadata: { connectorId, action: 'oauth_authorize' },
        });

        return jsonResponse({ success: true, data: { authorizationUrl, state } }, 200, origin);
    }

    if (parts[0] === 'callback' && req.method === 'GET') {
        const state = url.searchParams.get('state');
        const code = url.searchParams.get('code');

        if (!state || !code) {
            return errorResponse('Missing state or code', 400, origin);
        }

        try {
            const result = await connectorV2.oauth.handleOAuthCallback(state, code);
            
            await logSecurityEvent('CONNECTOR_CREATED', {
                userId: result.userId,
                success: true,
                ipAddress: req.headers.get('x-forwarded-for') || undefined,
                userAgent: req.headers.get('user-agent') || undefined,
                metadata: { connectorId: result.connectorId, action: 'oauth_callback' },
            });

            return jsonResponse({ success: true, data: result }, 200, origin);
        } catch (error) {
            await logSecurityEvent('CONNECTOR_CREATED', {
                success: false,
                ipAddress: req.headers.get('x-forwarded-for') || undefined,
                userAgent: req.headers.get('user-agent') || undefined,
                metadata: { action: 'oauth_callback', error: (error as Error).message },
            });
            return errorResponse('OAuth callback failed', 400, origin);
        }
    }

    if (parts[0] === 'refresh' && req.method === 'POST') {
        const user = await requireAuth(req);
        const body = await req.json();
        const { connectorId } = body;

        if (!connectorId) {
            return errorResponse('Missing connectorId', 400, origin);
        }

        try {
            const connection = await connectorV2.manager.getUserConnectionsByConnector(user.id, connectorId);
            if (!connection.length) {
                return errorResponse('Connection not found', 404, origin);
            }

            const creds = connection[0].credentials;
            const tokenData = await connectorV2.tokens.refreshToken(user.id, connectorId, creds);

            return jsonResponse({ success: true, data: tokenData }, 200, origin);
        } catch (error) {
            return errorResponse('Token refresh failed', 400, origin);
        }
    }

    if (parts[0] === 'revoke' && req.method === 'POST') {
        const user = await requireAuth(req);
        const body = await req.json();
        const { connectorId } = body;

        if (!connectorId) {
            return errorResponse('Missing connectorId', 400, origin);
        }

        await connectorV2.oauth.revokeAccess(user.id, connectorId);

        await logSecurityEvent('CONNECTOR_REVOKED', {
            userId: user.id,
            success: true,
            ipAddress: req.headers.get('x-forwarded-for') || undefined,
            userAgent: req.headers.get('user-agent') || undefined,
            metadata: { connectorId, action: 'oauth_revoke' },
        });

        return jsonResponse({ success: true }, 200, origin);
    }

    return errorResponse('Not found', 404, origin);
}

async function handleWebhooksRoute(
    req: Request,
    parts: string[],
    requestId: string,
    origin: string
): Promise<Response> {
    if (parts.length === 0) return errorResponse('Not found', 404, origin);

    const connectorId = parts[0];

    if (!connectorV2.registry.hasConnector(connectorId)) {
        return errorResponse('Connector not found', 404, origin);
    }

    const config = connectorV2.registry.getConfig(connectorId);
    const payload = await req.text();
    
    let signature = req.headers.get('x-hub-signature-256') ||
                    req.headers.get('stripe-signature') ||
                    req.headers.get('x-slack-signature') ||
                    req.headers.get('x-signature-ed25519') ||
                    '';

    try {
        const instance = connectorV2.registry.createInstance(connectorId, {});
        const webhookHandler = instance.getWebhookHandler?.();
        
        if (!webhookHandler) {
            return errorResponse('Webhook handler not available', 400, origin);
        }

        const isValid = await webhookHandler.verify(payload, signature);
        if (!isValid) {
            await logSecurityEvent('CONNECTOR_REVOKED', {
                success: false,
                ipAddress: req.headers.get('x-forwarded-for') || undefined,
                userAgent: req.headers.get('user-agent') || undefined,
                metadata: { connectorId, action: 'webhook_verify_failed' },
            });
            return errorResponse('Invalid webhook signature', 400, origin);
        }

        const event = {
            id: crypto.randomUUID(),
            type: connectorId,
            timestamp: new Date().toISOString(),
            payload: JSON.parse(payload),
            headers: Object.fromEntries(req.headers.entries()),
        };

        const result = await webhookHandler.handle(event);
        return jsonResponse(result, result.success ? 200 : 400, origin);
    } catch (error) {
        console.error('Webhook handling failed:', error);
        return errorResponse('Webhook processing failed', 400, origin);
    }
}
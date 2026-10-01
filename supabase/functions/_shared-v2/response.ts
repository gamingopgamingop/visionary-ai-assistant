export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
        details?: Record<string, unknown>;
        retryable?: boolean;
        statusCode?: number;
    };
    meta?: Record<string, unknown>;
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

export function createSuccessResponse<T>(data: T, meta?: Record<string, unknown>): ApiResponse<T> {
    return {
        success: true,
        data,
        meta,
    };
}

export function createErrorResponse(
    error: { code: string; message: string; details?: Record<string, unknown>; retryable?: boolean; statusCode?: number },
    meta?: Record<string, unknown>
): ApiResponse<null> {
    return {
        success: false,
        error,
        meta,
    };
}

export function createPaginatedResponse<T>(
    data: T[],
    page: number,
    limit: number,
    total?: number,
    nextCursor?: string,
    nextPage?: number
): PaginatedResponse<T> {
    return {
        data,
        pagination: {
            page,
            limit,
            total,
            hasMore: total !== undefined ? page * limit < total : data.length === limit,
            nextCursor,
            nextPage,
        },
    };
}

export function jsonResponse<T>(data: T, status: number = 200): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

export function successResponse<T>(data: T, meta?: Record<string, unknown>): Response {
    return jsonResponse(createSuccessResponse(data, meta));
}

export function errorResponse(
    code: string,
    message: string,
    status: number = 400,
    details?: Record<string, unknown>,
    retryable: boolean = false
): Response {
    return jsonResponse(createErrorResponse({ code, message, details, retryable, statusCode: status }), status);
}

export function paginatedResponse<T>(
    data: T[],
    page: number,
    limit: number,
    total?: number,
    nextCursor?: string,
    nextPage?: number
): Response {
    return jsonResponse(createPaginatedResponse(data, page, limit, total, nextCursor, nextPage));
}

export function corsHeaders(origin?: string): Record<string, string> {
    return {
        'Access-Control-Allow-Origin': origin || '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
        'Access-Control-Max-Age': '86400',
    };
}

export function handleCors(req: Request): Response | null {
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: corsHeaders(req.headers.get('Origin') || undefined),
        });
    }
    return null;
}

export function addCorsHeaders(response: Response, origin?: string): Response {
    const headers = new Headers(response.headers);
    for (const [key, value] of Object.entries(corsHeaders(origin))) {
        headers.set(key, value);
    }
    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
    });
}
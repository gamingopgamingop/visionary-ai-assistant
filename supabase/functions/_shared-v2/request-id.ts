export function generateRequestId(): string {
    return crypto.randomUUID();
}

export function generateTraceId(): string {
    return crypto.randomUUID();
}

export function getRequestId(req: Request): string {
    return req.headers.get('x-request-id') || generateRequestId();
}

export function getTraceId(req: Request): string {
    return req.headers.get('x-trace-id') || generateTraceId();
}

export function getCorrelationId(req: Request): string {
    return req.headers.get('x-correlation-id') || getRequestId(req);
}

export function addRequestIdHeaders(headers: Headers, requestId: string, traceId?: string): void {
    headers.set('x-request-id', requestId);
    if (traceId) {
        headers.set('x-trace-id', traceId);
    }
}

export function createRequestIdMiddleware() {
    return async (req: Request, next: (req: Request) => Promise<Response>): Promise<Response> => {
        const requestId = getRequestId(req);
        const traceId = getTraceId(req);
        
        const response = await next(req);
        
        addRequestIdHeaders(response.headers, requestId, traceId);
        return response;
    };
}

export interface RequestContext {
    requestId: string;
    traceId: string;
    correlationId: string;
    startTime: number;
}

export function createRequestContext(req: Request): RequestContext {
    return {
        requestId: getRequestId(req),
        traceId: getTraceId(req),
        correlationId: getCorrelationId(req),
        startTime: performance.now(),
    };
}

export function getElapsedTime(context: RequestContext): number {
    return performance.now() - context.startTime;
}
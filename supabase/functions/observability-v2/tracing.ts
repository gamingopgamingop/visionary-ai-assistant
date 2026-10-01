import type { TraceSpan, SpanLog, ObservabilityConfig } from './types.ts';

const SPANS_BUFFER: TraceSpan[] = [];
const MAX_BUFFER_SIZE = 1000;

function getObservabilityConfig(): ObservabilityConfig {
    return {
        enabled: Deno.env.get('OBSERVABILITY_ENABLED') === 'true',
        serviceName: Deno.env.get('OBSERVABILITY_SERVICE_NAME') || 'visionary-ai',
        sampleRate: parseFloat(Deno.env.get('OBSERVABILITY_SAMPLE_RATE') || '1.0'),
        exportIntervalMs: parseInt(Deno.env.get('OBSERVABILITY_EXPORT_INTERVAL_MS') || '30000', 10),
    };
}

function generateSpanId(): string {
    const array = new Uint8Array(8);
    crypto.getRandomValues(array);
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

function generateTraceId(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

export interface Tracer {
    startSpan(operationName: string, parentSpan?: TraceSpan): TraceSpan;
    endSpan(span: TraceSpan, error?: Error): void;
    addLog(span: TraceSpan, fields: Record<string, unknown>): void;
    setTag(span: TraceSpan, key: string, value: string): void;
}

export function createTracer(): Tracer {
    return {
        startSpan(operationName: string, parentSpan?: TraceSpan): TraceSpan {
            const config = getObservabilityConfig();
            
            if (!config.enabled || Math.random() > config.sampleRate) {
                return createNoopSpan();
            }

            const traceId = parentSpan?.traceId || generateTraceId();
            const spanId = generateSpanId();
            
            const span: TraceSpan = {
                traceId,
                spanId,
                parentSpanId: parentSpan?.spanId,
                operationName,
                startTime: Date.now(),
                tags: {
                    service: config.serviceName,
                },
                logs: [],
                status: 'ok',
            };

            SPANS_BUFFER.push(span);
            
            if (SPANS_BUFFER.length > MAX_BUFFER_SIZE) {
                SPANS_BUFFER.shift();
            }

            return span;
        },

        endSpan(span: TraceSpan, error?: Error): void {
            const config = getObservabilityConfig();
            if (!config.enabled) return;
            
            span.endTime = Date.now();
            span.durationMs = span.endTime - span.startTime;
            
            if (error) {
                span.status = 'error';
                span.error = error.message;
                span.tags.error = 'true';
                span.tags.errorMessage = error.message;
            }
        },

        addLog(span: TraceSpan, fields: Record<string, unknown>): void {
            const config = getObservabilityConfig();
            if (!config.enabled) return;
            
            const log: SpanLog = {
                timestamp: Date.now(),
                fields,
            };
            span.logs.push(log);
        },

        setTag(span: TraceSpan, key: string, value: string): void {
            const config = getObservabilityConfig();
            if (!config.enabled) return;
            span.tags[key] = value;
        },
    };
}

function createNoopSpan(): TraceSpan {
    return {
        traceId: 'noop',
        spanId: 'noop',
        operationName: 'noop',
        startTime: Date.now(),
        tags: {},
        logs: [],
        status: 'ok',
    };
}

export async function traceAsync<T>(
    operationName: string,
    fn: () => Promise<T>,
    parentSpan?: TraceSpan
): Promise<T> {
    const tracer = createTracer();
    const span = tracer.startSpan(operationName, parentSpan);
    
    try {
        const result = await fn();
        tracer.endSpan(span);
        return result;
    } catch (error) {
        tracer.endSpan(span, error as Error);
        throw error;
    }
}

export function traceSync<T>(
    operationName: string,
    fn: () => T,
    parentSpan?: TraceSpan
): T {
    const tracer = createTracer();
    const span = tracer.startSpan(operationName, parentSpan);
    
    try {
        const result = fn();
        tracer.endSpan(span);
        return result;
    } catch (error) {
        tracer.endSpan(span, error as Error);
        throw error;
    }
}

export function getActiveSpans(): TraceSpan[] {
    return SPANS_BUFFER.filter(s => !s.endTime);
}

export function getCompletedSpans(): TraceSpan[] {
    return SPANS_BUFFER.filter(s => s.endTime);
}

export function getSpansByTraceId(traceId: string): TraceSpan[] {
    return SPANS_BUFFER.filter(s => s.traceId === traceId);
}

export function clearSpansBuffer(): void {
    SPANS_BUFFER.length = 0;
}

export function getSpansBuffer(): TraceSpan[] {
    return [...SPANS_BUFFER];
}
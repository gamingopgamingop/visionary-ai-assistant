export interface ObservabilityConfig {
    enabled: boolean;
    serviceName: string;
    sampleRate: number;
    exportIntervalMs: number;
}

export interface MetricData {
    name: string;
    value: number;
    unit: string;
    tags: Record<string, string>;
    timestamp: number;
}

export interface TraceSpan {
    traceId: string;
    spanId: string;
    parentSpanId?: string;
    operationName: string;
    startTime: number;
    endTime?: number;
    durationMs?: number;
    tags: Record<string, string>;
    logs: SpanLog[];
    status: 'ok' | 'error';
    error?: string;
}

export interface SpanLog {
    timestamp: number;
    fields: Record<string, unknown>;
}

export interface HealthCheckResult {
    service: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    latencyMs?: number;
    details?: Record<string, unknown>;
    timestamp: number;
}

export interface LogEntry {
    level: 'debug' | 'info' | 'warn' | 'error';
    message: string;
    timestamp: number;
    traceId?: string;
    spanId?: string;
    fields: Record<string, unknown>;
}
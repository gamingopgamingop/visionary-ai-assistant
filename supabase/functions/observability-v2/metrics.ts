import type { MetricData, ObservabilityConfig } from './types.ts';

const METRICS_BUFFER: MetricData[] = [];
const MAX_BUFFER_SIZE = 10000;

function getObservabilityConfig(): ObservabilityConfig {
    return {
        enabled: Deno.env.get('OBSERVABILITY_ENABLED') === 'true',
        serviceName: Deno.env.get('OBSERVABILITY_SERVICE_NAME') || 'visionary-ai',
        sampleRate: parseFloat(Deno.env.get('OBSERVABILITY_SAMPLE_RATE') || '1.0'),
        exportIntervalMs: parseInt(Deno.env.get('OBSERVABILITY_EXPORT_INTERVAL_MS') || '30000', 10),
    };
}

export function recordMetric(
    name: string,
    value: number,
    unit: string = 'count',
    tags: Record<string, string> = {}
): void {
    const config = getObservabilityConfig();
    
    if (!config.enabled) return;

    if (Math.random() > config.sampleRate) return;

    const metric: MetricData = {
        name,
        value,
        unit,
        tags: {
            service: config.serviceName,
            ...tags,
        },
        timestamp: Date.now(),
    };

    METRICS_BUFFER.push(metric);

    if (METRICS_BUFFER.length > MAX_BUFFER_SIZE) {
        METRICS_BUFFER.shift();
    }
}

export function incrementCounter(name: string, tags: Record<string, string> = {}): void {
    recordMetric(name, 1, 'count', tags);
}

export function recordGauge(name: string, value: number, tags: Record<string, string> = {}): void {
    recordMetric(name, value, 'gauge', tags);
}

export function recordHistogram(name: string, value: number, tags: Record<string, string> = {}): void {
    recordMetric(name, value, 'ms', tags);
}

export function recordTiming(name: string, durationMs: number, tags: Record<string, string> = {}): void {
    recordHistogram(name, durationMs, tags);
}

export async function timeAsync<T>(
    name: string,
    fn: () => Promise<T>,
    tags: Record<string, string> = {}
): Promise<T> {
    const start = performance.now();
    try {
        const result = await fn();
        recordTiming(name, performance.now() - start, { ...tags, status: 'success' });
        return result;
    } catch (error) {
        recordTiming(name, performance.now() - start, { ...tags, status: 'error' });
        throw error;
    }
}

export function timeSync<T>(
    name: string,
    fn: () => T,
    tags: Record<string, string> = {}
): T {
    const start = performance.now();
    try {
        const result = fn();
        recordTiming(name, performance.now() - start, { ...tags, status: 'success' });
        return result;
    } catch (error) {
        recordTiming(name, performance.now() - start, { ...tags, status: 'error' });
        throw error;
    }
}

export function getMetricsBuffer(): MetricData[] {
    return [...METRICS_BUFFER];
}

export function clearMetricsBuffer(): void {
    METRICS_BUFFER.length = 0;
}

export function getMetricsByName(name: string): MetricData[] {
    return METRICS_BUFFER.filter(m => m.name === name);
}

export function getMetricsByTag(tagKey: string, tagValue: string): MetricData[] {
    return METRICS_BUFFER.filter(m => m.tags[tagKey] === tagValue);
}
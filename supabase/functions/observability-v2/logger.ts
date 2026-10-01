import type { LogEntry, ObservabilityConfig } from './types.ts';

const LOGS_BUFFER: LogEntry[] = [];
const MAX_BUFFER_SIZE = 1000;

function getObservabilityConfig(): ObservabilityConfig {
    return {
        enabled: Deno.env.get('OBSERVABILITY_ENABLED') === 'true',
        serviceName: Deno.env.get('OBSERVABILITY_SERVICE_NAME') || 'visionary-ai',
        sampleRate: parseFloat(Deno.env.get('OBSERVABILITY_SAMPLE_RATE') || '1.0'),
        exportIntervalMs: parseInt(Deno.env.get('OBSERVABILITY_EXPORT_INTERVAL_MS') || '30000', 10),
    };
}

export function log(
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    fields: Record<string, unknown> = {}
): void {
    const config = getObservabilityConfig();
    
    if (!config.enabled) return;

    if (Math.random() > config.sampleRate) return;

    const entry: LogEntry = {
        level,
        message,
        timestamp: Date.now(),
        fields: {
            service: config.serviceName,
            ...fields,
        },
    };

    LOGS_BUFFER.push(entry);

    if (LOGS_BUFFER.length > MAX_BUFFER_SIZE) {
        LOGS_BUFFER.shift();
    }

    const formatted = formatLogEntry(entry);
    
    switch (level) {
        case 'debug':
        case 'info':
            console.log(formatted);
            break;
        case 'warn':
            console.warn(formatted);
            break;
        case 'error':
            console.error(formatted);
            break;
    }
}

function formatLogEntry(entry: LogEntry): string {
    const timestamp = new Date(entry.timestamp).toISOString();
    const fieldsStr = Object.keys(entry.fields).length > 0 
        ? ` ${JSON.stringify(entry.fields)}` 
        : '';
    return `[${timestamp}] [${entry.level.toUpperCase()}] ${entry.message}${fieldsStr}`;
}

export function debug(message: string, fields?: Record<string, unknown>): void {
    log('debug', message, fields);
}

export function info(message: string, fields?: Record<string, unknown>): void {
    log('info', message, fields);
}

export function warn(message: string, fields?: Record<string, unknown>): void {
    log('warn', message, fields);
}

export function error(message: string, fields?: Record<string, unknown>): void {
    log('error', message, fields);
}

export function createChildLogger(baseFields: Record<string, unknown>) {
    return {
        debug: (message: string, fields?: Record<string, unknown>) => 
            debug(message, { ...baseFields, ...fields }),
        info: (message: string, fields?: Record<string, unknown>) => 
            info(message, { ...baseFields, ...fields }),
        warn: (message: string, fields?: Record<string, unknown>) => 
            warn(message, { ...baseFields, ...fields }),
        error: (message: string, fields?: Record<string, unknown>) => 
            error(message, { ...baseFields, ...fields }),
    };
}

export function getLogsBuffer(): LogEntry[] {
    return [...LOGS_BUFFER];
}

export function clearLogsBuffer(): void {
    LOGS_BUFFER.length = 0;
}
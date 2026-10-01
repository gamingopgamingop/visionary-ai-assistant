import { createClient } from '@supabase/supabase-js';
import type { AuditConfig, AuditAction, AuditLogEntry, AuditLogQuery, AuditStats } from './types.ts';

const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const BUFFER: AuditLogEntry[] = [];
let flushTimeout: number | null = null;

function getAuditConfig(): AuditConfig {
    return {
        enabled: Deno.env.get('NEW_AUDIT_ENABLED') === 'true',
        retentionDays: parseInt(Deno.env.get('AUDIT_RETENTION_DAYS') || '365', 10),
        batchSize: parseInt(Deno.env.get('AUDIT_BATCH_SIZE') || '100', 10),
        flushIntervalMs: parseInt(Deno.env.get('AUDIT_FLUSH_INTERVAL_MS') || '5000', 10),
    };
}

function sanitizeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
    const sensitiveKeys = [
        'password', 'token', 'secret', 'key', 'authorization',
        'access_token', 'refresh_token', 'api_key', 'client_secret',
        'jwt', 'cookie', 'session', 'credit_card', 'ssn',
        'private_key', 'privatekey', 'apikey', 'api_key'
    ];

    const sanitized: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(metadata)) {
        const lowerKey = key.toLowerCase();
        if (sensitiveKeys.some(k => lowerKey.includes(k))) {
            sanitized[key] = '[REDACTED]';
        } else if (typeof value === 'object' && value !== null) {
            sanitized[key] = sanitizeMetadata(value as Record<string, unknown>);
        } else if (typeof value === 'string' && value.length > 1000) {
            sanitized[key] = value.slice(0, 1000) + '...[TRUNCATED]';
        } else {
            sanitized[key] = value;
        }
    }

    return sanitized;
}

export async function logAuditEvent(
    action: AuditAction,
    options: {
        userId?: string;
        success: boolean;
        resourceType?: string;
        resourceId?: string;
        ipAddress?: string;
        userAgent?: string;
        metadata?: Record<string, unknown>;
    }
): Promise<void> {
    const config = getAuditConfig();
    
    if (!config.enabled) {
        return;
    }

    const entry: AuditLogEntry = {
        id: crypto.randomUUID(),
        userId: options.userId,
        action,
        resourceType: options.resourceType,
        resourceId: options.resourceId,
        success: options.success,
        ipAddress: options.ipAddress,
        userAgent: options.userAgent,
        metadata: sanitizeMetadata(options.metadata || {}),
        createdAt: new Date().toISOString(),
    };

    BUFFER.push(entry);

    if (BUFFER.length >= config.batchSize) {
        await flushBuffer();
    } else if (!flushTimeout) {
        flushTimeout = setTimeout(() => flushBuffer(), config.flushIntervalMs);
    }
}

async function flushBuffer(): Promise<void> {
    if (flushTimeout) {
        clearTimeout(flushTimeout);
        flushTimeout = null;
    }

    if (BUFFER.length === 0) return;

    const entries = BUFFER.splice(0, BUFFER.length);

    const { error } = await supabase.from('audit_logs').insert(
        entries.map(e => ({
            id: e.id,
            user_id: e.userId,
            action: e.action,
            resource_type: e.resourceType,
            resource_id: e.resourceId,
            success: e.success,
            ip_address: e.ipAddress,
            user_agent: e.userAgent,
            metadata: e.metadata,
            created_at: e.createdAt,
        }))
    );

    if (error) {
        console.error('Failed to flush audit buffer:', error);
        BUFFER.unshift(...entries);
    }
}

export async function queryAuditLogs(query: AuditLogQuery): Promise<AuditLogEntry[]> {
    let dbQuery = supabase.from('audit_logs').select('*');

    if (query.userId) {
        dbQuery = dbQuery.eq('user_id', query.userId);
    }
    if (query.action) {
        dbQuery = dbQuery.eq('action', query.action);
    }
    if (query.resourceType) {
        dbQuery = dbQuery.eq('resource_type', query.resourceType);
    }
    if (query.resourceId) {
        dbQuery = dbQuery.eq('resource_id', query.resourceId);
    }
    if (query.success !== undefined) {
        dbQuery = dbQuery.eq('success', query.success);
    }
    if (query.startDate) {
        dbQuery = dbQuery.gte('created_at', query.startDate);
    }
    if (query.endDate) {
        dbQuery = dbQuery.lte('created_at', query.endDate);
    }

    dbQuery = dbQuery
        .order('created_at', { ascending: false })
        .limit(query.limit || 100)
        .range(query.offset || 0, (query.offset || 0) + (query.limit || 100) - 1);

    const { data, error } = await dbQuery;

    if (error) throw new Error(`Failed to query audit logs: ${error.message}`);

    return (data || []).map(mapRowToEntry);
}

export async function getAuditStats(
    userId?: string,
    startDate?: string,
    endDate?: string
): Promise<AuditStats> {
    let query = supabase.from('audit_logs').select('action, user_id, success, created_at');

    if (userId) {
        query = query.eq('user_id', userId);
    }
    if (startDate) {
        query = query.gte('created_at', startDate);
    }
    if (endDate) {
        query = query.lte('created_at', endDate);
    }

    const { data, error } = await query;

    if (error) throw new Error(`Failed to get audit stats: ${error.message}`);

    const events = data || [];
    const totalEvents = events.length;
    const successEvents = events.filter(e => e.success).length;

    const eventsByAction: Record<string, number> = {};
    const eventsByUser: Record<string, number> = {};

    for (const event of events) {
        eventsByAction[event.action] = (eventsByAction[event.action] || 0) + 1;
        if (event.user_id) {
            eventsByUser[event.user_id] = (eventsByUser[event.user_id] || 0) + 1;
        }
    }

    const dates = events.map(e => new Date(e.created_at).getTime()).sort((a, b) => a - b);

    return {
        totalEvents,
        eventsByAction,
        eventsByUser,
        successRate: totalEvents > 0 ? successEvents / totalEvents : 0,
        timeRange: {
            start: dates[0] ? new Date(dates[0]).toISOString() : new Date().toISOString(),
            end: dates[dates.length - 1] ? new Date(dates[dates.length - 1]).toISOString() : new Date().toISOString(),
        },
    };
}

export async function cleanupOldAuditLogs(): Promise<number> {
    const config = getAuditConfig();
    const cutoffDate = new Date(Date.now() - config.retentionDays * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
        .from('audit_logs')
        .delete()
        .lt('created_at', cutoffDate)
        .select('id');

    if (error) throw new Error(`Failed to cleanup audit logs: ${error.message}`);

    return data?.length || 0;
}

function mapRowToEntry(row: any): AuditLogEntry {
    return {
        id: row.id,
        userId: row.user_id,
        action: row.action,
        resourceType: row.resource_type,
        resourceId: row.resource_id,
        success: row.success,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        metadata: row.metadata || {},
        createdAt: row.created_at,
    };
}

export function getAuditBufferSize(): number {
    return BUFFER.length;
}

export async function forceFlush(): Promise<void> {
    await flushBuffer();
}
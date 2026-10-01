import { createClient } from '@supabase/supabase-js';
import type { UsageRecord } from './types.ts';

const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

export async function recordUsage(record: UsageRecord): Promise<void> {
    const { error } = await supabase.from('usage_records').insert({
        user_id: record.userId,
        provider_id: record.providerId,
        model_id: record.modelId,
        resource_type: record.resourceType,
        quantity: record.quantity,
        metadata: record.metadata || {},
        created_at: record.timestamp || new Date().toISOString(),
    });

    if (error) {
        console.error('Failed to record usage:', error);
    }
}

export async function recordAIUsage(
    userId: string,
    providerId: string,
    modelId: string,
    resourceType: 'requests' | 'tokens' | 'images',
    quantity: number,
    metadata?: Record<string, unknown>
): Promise<void> {
    await recordUsage({
        userId,
        providerId,
        modelId,
        resourceType,
        quantity,
        metadata,
        timestamp: new Date().toISOString(),
    });
}

export async function getUsage(
    userId: string,
    resourceType?: string,
    startDate?: string,
    endDate?: string,
    limit: number = 100
): Promise<UsageRecord[]> {
    let query = supabase
        .from('usage_records')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (resourceType) {
        query = query.eq('resource_type', resourceType);
    }
    if (startDate) {
        query = query.gte('created_at', startDate);
    }
    if (endDate) {
        query = query.lte('created_at', endDate);
    }

    const { data, error } = await query;

    if (error) throw new Error(`Failed to get usage: ${error.message}`);

    return (data || []).map(mapRowToUsage);
}

export async function getUsageSummary(
    userId: string,
    startDate?: string,
    endDate?: string
): Promise<Record<string, number>> {
    let query = supabase
        .from('usage_records')
        .select('resource_type, quantity')
        .eq('user_id', userId);

    if (startDate) {
        query = query.gte('created_at', startDate);
    }
    if (endDate) {
        query = query.lte('created_at', endDate);
    }

    const { data, error } = await query;

    if (error) throw new Error(`Failed to get usage summary: ${error.message}`);

    const summary: Record<string, number> = {};
    for (const row of data || []) {
        summary[row.resource_type] = (summary[row.resource_type] || 0) + row.quantity;
    }

    return summary;
}

export async function getUsageByModel(
    userId: string,
    startDate?: string,
    endDate?: string
): Promise<Record<string, Record<string, number>>> {
    let query = supabase
        .from('usage_records')
        .select('model_id, resource_type, quantity')
        .eq('user_id', userId);

    if (startDate) {
        query = query.gte('created_at', startDate);
    }
    if (endDate) {
        query = query.lte('created_at', endDate);
    }

    const { data, error } = await query;

    if (error) throw new Error(`Failed to get usage by model: ${error.message}`);

    const summary: Record<string, Record<string, number>> = {};
    for (const row of data || []) {
        if (!summary[row.model_id]) {
            summary[row.model_id] = {};
        }
        summary[row.model_id][row.resource_type] = 
            (summary[row.model_id][row.resource_type] || 0) + row.quantity;
    }

    return summary;
}

export async function getUsageByProvider(
    userId: string,
    startDate?: string,
    endDate?: string
): Promise<Record<string, Record<string, number>>> {
    let query = supabase
        .from('usage_records')
        .select('provider_id, resource_type, quantity')
        .eq('user_id', userId);

    if (startDate) {
        query = query.gte('created_at', startDate);
    }
    if (endDate) {
        query = query.lte('created_at', endDate);
    }

    const { data, error } = await query;

    if (error) throw new Error(`Failed to get usage by provider: ${error.message}`);

    const summary: Record<string, Record<string, number>> = {};
    for (const row of data || []) {
        if (!summary[row.provider_id]) {
            summary[row.provider_id] = {};
        }
        summary[row.provider_id][row.resource_type] = 
            (summary[row.provider_id][row.resource_type] || 0) + row.quantity;
    }

    return summary;
}

function mapRowToUsage(row: any): UsageRecord {
    return {
        userId: row.user_id,
        providerId: row.provider_id,
        modelId: row.model_id,
        resourceType: row.resource_type,
        quantity: row.quantity,
        metadata: row.metadata || {},
        timestamp: row.created_at,
    };
}

export async function getDailyUsage(
    userId: string,
    days: number = 30
): Promise<Record<string, Record<string, number>>> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
        .from('usage_records')
        .select('created_at, resource_type, quantity')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

    if (error) throw new Error(`Failed to get daily usage: ${error.message}`);

    const daily: Record<string, Record<string, number>> = {};
    
    for (const row of data || []) {
        const date = new Date(row.created_at).toISOString().split('T')[0];
        if (!daily[date]) {
            daily[date] = {};
        }
        daily[date][row.resource_type] = (daily[date][row.resource_type] || 0) + row.quantity;
    }

    return daily;
}
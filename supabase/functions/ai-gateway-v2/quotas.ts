import { createClient } from '@supabase/supabase-js';
import type { QuotaCheckResult } from './types.ts';

const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

export interface QuotaConfig {
    enabled: boolean;
    defaultLimits: Record<string, { limit: number; period: string }>;
}

const PLAN_LIMITS: Record<string, Record<string, { limit: number; period: string }>> = {
    free: {
        ai_requests: { limit: 100, period: 'daily' },
        ai_tokens: { limit: 50000, period: 'daily' },
        ai_images: { limit: 10, period: 'daily' },
        connector_calls: { limit: 100, period: 'daily' },
        api_calls: { limit: 1000, period: 'daily' },
        storage: { limit: 100, period: 'monthly' },
        background_jobs: { limit: 10, period: 'daily' },
    },
    pro: {
        ai_requests: { limit: 1000, period: 'daily' },
        ai_tokens: { limit: 1000000, period: 'daily' },
        ai_images: { limit: 100, period: 'daily' },
        connector_calls: { limit: 1000, period: 'daily' },
        api_calls: { limit: 10000, period: 'daily' },
        storage: { limit: 10000, period: 'monthly' },
        background_jobs: { limit: 100, period: 'daily' },
    },
    business: {
        ai_requests: { limit: 10000, period: 'daily' },
        ai_tokens: { limit: 10000000, period: 'daily' },
        ai_images: { limit: 1000, period: 'daily' },
        connector_calls: { limit: 10000, period: 'daily' },
        api_calls: { limit: 100000, period: 'daily' },
        storage: { limit: 100000, period: 'monthly' },
        background_jobs: { limit: 1000, period: 'daily' },
    },
    enterprise: {
        ai_requests: { limit: 100000, period: 'daily' },
        ai_tokens: { limit: 100000000, period: 'daily' },
        ai_images: { limit: 10000, period: 'daily' },
        connector_calls: { limit: 100000, period: 'daily' },
        api_calls: { limit: 1000000, period: 'daily' },
        storage: { limit: 1000000, period: 'monthly' },
        background_jobs: { limit: 10000, period: 'daily' },
    },
};

function getQuotaConfig(): QuotaConfig {
    return {
        enabled: Deno.env.get('NEW_QUOTA_ENABLED') === 'true',
        defaultLimits: PLAN_LIMITS.free,
    };
}

function getPeriodStart(period: string): Date {
    const now = new Date();
    switch (period) {
        case 'hourly':
            return new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0, 0);
        case 'daily':
            return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        case 'weekly':
            const day = now.getDay();
            return new Date(now.getFullYear(), now.getMonth(), now.getDate() - day, 0, 0, 0);
        case 'monthly':
            return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        case 'yearly':
            return new Date(now.getFullYear(), 0, 1, 0, 0, 0);
        default:
            return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    }
}

function getPeriodEnd(period: string, start: Date): Date {
    const end = new Date(start);
    switch (period) {
        case 'hourly':
            end.setHours(end.getHours() + 1);
            break;
        case 'daily':
            end.setDate(end.getDate() + 1);
            break;
        case 'weekly':
            end.setDate(end.getDate() + 7);
            break;
        case 'monthly':
            end.setMonth(end.getMonth() + 1);
            break;
        case 'yearly':
            end.setFullYear(end.getFullYear() + 1);
            break;
    }
    return end;
}

export async function checkQuota(
    userId: string,
    resourceType: string,
    quantity: number = 1
): Promise<QuotaCheckResult> {
    const config = getQuotaConfig();
    
    if (!config.enabled) {
        return {
            allowed: true,
            remaining: 999999,
            limit: 999999,
            resetAt: Date.now() + 86400000,
            resourceType,
        };
    }

    const planType = await getUserPlanType(userId);
    const limits = PLAN_LIMITS[planType] || PLAN_LIMITS.free;
    const resourceLimit = limits[resourceType] || { limit: 100, period: 'daily' };

    const periodStart = getPeriodStart(resourceLimit.period);
    const periodEnd = getPeriodEnd(resourceLimit.period, periodStart);

    let { data: quota, error } = await supabase
        .from('quotas')
        .select('*')
        .eq('user_id', userId)
        .eq('resource_type', resourceType)
        .eq('period', resourceLimit.period)
        .maybeSingle();

    if (error) throw new Error(`Failed to check quota: ${error.message}`);

    if (!quota) {
        quota = await createQuota(userId, resourceType, resourceLimit.limit, resourceLimit.period, periodStart);
    }

    const used = quota.used + quantity;
    const allowed = used <= quota.limit;
    const remaining = Math.max(0, quota.limit - used);

    if (allowed) {
        await supabase
            .from('quotas')
            .update({ used, updated_at: new Date().toISOString() })
            .eq('id', quota.id);
    }

    return {
        allowed,
        remaining,
        limit: quota.limit,
        resetAt: periodEnd.getTime(),
        resourceType,
    };
}

export async function getQuota(userId: string, resourceType: string): Promise<QuotaCheckResult | null> {
    const planType = await getUserPlanType(userId);
    const limits = PLAN_LIMITS[planType] || PLAN_LIMITS.free;
    const resourceLimit = limits[resourceType];

    if (!resourceLimit) return null;

    const { data: quota, error } = await supabase
        .from('quotas')
        .select('*')
        .eq('user_id', userId)
        .eq('resource_type', resourceType)
        .eq('period', resourceLimit.period)
        .maybeSingle();

    if (error || !quota) return null;

    const periodStart = getPeriodStart(resourceLimit.period);
    const periodEnd = getPeriodEnd(resourceLimit.period, periodStart);

    return {
        allowed: quota.used < quota.limit,
        remaining: Math.max(0, quota.limit - quota.used),
        limit: quota.limit,
        resetAt: periodEnd.getTime(),
        resourceType,
    };
}

export async function getAllQuotas(userId: string): Promise<QuotaCheckResult[]> {
    const planType = await getUserPlanType(userId);
    const limits = PLAN_LIMITS[planType] || PLAN_LIMITS.free;

    const results: QuotaCheckResult[] = [];

    for (const [resourceType, limit] of Object.entries(limits)) {
        const result = await getQuota(userId, resourceType);
        if (result) results.push(result);
    }

    return results;
}

export async function resetQuota(userId: string, resourceType: string): Promise<void> {
    const planType = await getUserPlanType(userId);
    const limits = PLAN_LIMITS[planType] || PLAN_LIMITS.free;
    const resourceLimit = limits[resourceType];

    if (!resourceLimit) return;

    const periodStart = getPeriodStart(resourceLimit.period);

    await supabase
        .from('quotas')
        .update({ 
            used: 0, 
            period_start: periodStart.toISOString(),
            updated_at: new Date().toISOString() 
        })
        .eq('user_id', userId)
        .eq('resource_type', resourceType)
        .eq('period', resourceLimit.period);
}

async function createQuota(
    userId: string,
    resourceType: string,
    limit: number,
    period: string,
    periodStart: Date
): Promise<any> {
    const now = new Date().toISOString();

    const { data, error } = await supabase.from('quotas').insert({
        user_id: userId,
        plan_type: await getUserPlanType(userId),
        resource_type: resourceType,
        limit,
        period,
        period_start: periodStart.toISOString(),
        used: 0,
        created_at: now,
        updated_at: now,
    }).select().single();

    if (error) throw new Error(`Failed to create quota: ${error.message}`);
    return data;
}

async function getUserPlanType(userId: string): Promise<string> {
    const { data, error } = await supabase
        .from('quotas')
        .select('plan_type')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error || !data) return 'free';
    return data.plan_type;
}

export async function initializeUserQuotas(userId: string, planType: string = 'free'): Promise<void> {
    const limits = PLAN_LIMITS[planType] || PLAN_LIMITS.free;
    const now = new Date().toISOString();

    for (const [resourceType, limit] of Object.entries(limits)) {
        const periodStart = getPeriodStart(limit.period);
        
        await supabase.from('quotas').upsert({
            user_id: userId,
            plan_type: planType,
            resource_type: resourceType,
            limit: limit.limit,
            period: limit.period,
            period_start: periodStart.toISOString(),
            used: 0,
            created_at: now,
            updated_at: now,
        }, { onConflict: 'user_id,resource_type,period' });
    }
}

export async function upgradeUserPlan(userId: string, newPlanType: string): Promise<void> {
    const limits = PLAN_LIMITS[newPlanType] || PLAN_LIMITS.free;
    const now = new Date().toISOString();

    for (const [resourceType, limit] of Object.entries(limits)) {
        const periodStart = getPeriodStart(limit.period);
        
        await supabase.from('quotas').upsert({
            user_id: userId,
            plan_type: newPlanType,
            resource_type: resourceType,
            limit: limit.limit,
            period: limit.period,
            period_start: periodStart.toISOString(),
            updated_at: now,
        }, { onConflict: 'user_id,resource_type,period' });
    }
}
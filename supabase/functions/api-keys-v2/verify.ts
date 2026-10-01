import { createClient } from '@supabase/supabase-js';
import { hashApiKey, constantTimeCompare } from '../connector-v2/security/api-key-hash.ts';
import type { ApiKeyData } from './types.ts';

const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

export async function verifyApiKey(key: string): Promise<ApiKeyData | null> {
    const prefix = key.split('_')[0];
    if (!prefix) return null;

    const keyHash = await hashApiKey(key);
    
    const { data, error } = await supabase
        .from('api_keys_v2')
        .select('*')
        .eq('key_hash', keyHash)
        .eq('revoked', false)
        .maybeSingle();

    if (error || !data) return null;

    const apiKey = mapRowToApiKey(data);

    if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
        await supabase
            .from('api_keys_v2')
            .update({ revoked: true, revoked_at: new Date().toISOString() })
            .eq('id', apiKey.id);
        return null;
    }

    await supabase
        .from('api_keys_v2')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', apiKey.id);

    return apiKey;
}

export async function checkApiKeyScope(apiKey: ApiKeyData, requiredScope: string): Promise<boolean> {
    return apiKey.scopes.includes(requiredScope) || apiKey.scopes.includes('*');
}

export async function checkApiKeyScopes(apiKey: ApiKeyData, requiredScopes: string[]): Promise<{ allowed: boolean; missing: string[] }> {
    const missing = requiredScopes.filter(scope => 
        !apiKey.scopes.includes(scope) && !apiKey.scopes.includes('*')
    );
    return {
        allowed: missing.length === 0,
        missing,
    };
}

export async function getApiKeyByPrefix(prefix: string): Promise<ApiKeyData[]> {
    const { data, error } = await supabase
        .from('api_keys_v2')
        .select('*')
        .eq('prefix', prefix)
        .eq('revoked', false);

    if (error) throw new Error(`Failed to get API keys by prefix: ${error.message}`);
    return (data || []).map(mapRowToApiKey);
}

function mapRowToApiKey(row: any): ApiKeyData {
    return {
        id: row.id,
        userId: row.user_id,
        name: row.name,
        prefix: row.prefix,
        keyHash: row.key_hash,
        scopes: row.scopes || [],
        expiresAt: row.expires_at,
        lastUsedAt: row.last_used_at,
        revoked: row.revoked,
        revokedAt: row.revoked_at,
        revokedBy: row.revoked_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}
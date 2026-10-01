import { createClient } from '@supabase/supabase-js';
import { hashApiKey, generateApiKey, constantTimeCompare } from '../connector-v2/security/api-key-hash.ts';
import type { ApiKeyConfig, ApiKeyData, CreateApiKeyRequest, CreateApiKeyResponse, ApiKeyScope } from './types.ts';

const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

function getApiKeyConfig(): ApiKeyConfig {
    return {
        enabled: Deno.env.get('NEW_API_KEYS_ENABLED') === 'true',
        prefix: Deno.env.get('API_KEY_PREFIX') || 'vk',
        defaultExpiryDays: parseInt(Deno.env.get('API_KEY_DEFAULT_EXPIRY_DAYS') || '90', 10),
        maxKeysPerUser: parseInt(Deno.env.get('API_KEY_MAX_PER_USER') || '10', 10),
    };
}

export async function createApiKey(
    userId: string,
    request: CreateApiKeyRequest
): Promise<CreateApiKeyResponse> {
    const config = getApiKeyConfig();
    
    if (!config.enabled) {
        throw new Error('API key system is disabled');
    }

    const { count } = await supabase
        .from('api_keys_v2')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('revoked', false);

    if ((count || 0) >= config.maxKeysPerUser) {
        throw new Error(`Maximum API keys (${config.maxKeysPerUser}) reached`);
    }

    const fullKey = generateApiKey(config.prefix);
    const keyHash = await hashApiKey(fullKey);
    const now = new Date().toISOString();
    const expiresAt = request.expiresInDays 
        ? new Date(Date.now() + request.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
        : new Date(Date.now() + config.defaultExpiryDays * 24 * 60 * 60 * 1000).toISOString();

    const apiKeyData: ApiKeyData = {
        id: crypto.randomUUID(),
        userId,
        name: request.name,
        prefix: config.prefix,
        keyHash,
        scopes: request.scopes,
        expiresAt,
        revoked: false,
        createdAt: now,
        updatedAt: now,
    };

    const { error } = await supabase.from('api_keys_v2').insert({
        id: apiKeyData.id,
        user_id: apiKeyData.userId,
        name: apiKeyData.name,
        prefix: apiKeyData.prefix,
        key_hash: apiKeyData.keyHash,
        scopes: apiKeyData.scopes,
        expires_at: apiKeyData.expiresAt,
        revoked: apiKeyData.revoked,
        created_at: apiKeyData.createdAt,
        updated_at: apiKeyData.updatedAt,
    });

    if (error) {
        throw new Error(`Failed to create API key: ${error.message}`);
    }

    return {
        id: apiKeyData.id,
        name: apiKeyData.name,
        prefix: apiKeyData.prefix,
        key: fullKey,
        scopes: apiKeyData.scopes,
        expiresAt: apiKeyData.expiresAt,
        createdAt: apiKeyData.createdAt,
    };
}

export async function getUserApiKeys(userId: string): Promise<ApiKeyData[]> {
    const { data, error } = await supabase
        .from('api_keys_v2')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to get API keys: ${error.message}`);
    return (data || []).map(mapRowToApiKey);
}

export async function getApiKey(keyId: string): Promise<ApiKeyData | null> {
    const { data, error } = await supabase
        .from('api_keys_v2')
        .select('*')
        .eq('id', keyId)
        .maybeSingle();

    if (error || !data) return null;
    return mapRowToApiKey(data);
}

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
        return null;
    }

    await supabase
        .from('api_keys_v2')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', apiKey.id);

    return apiKey;
}

export async function revokeApiKey(userId: string, keyId: string): Promise<boolean> {
    const { data, error } = await supabase
        .from('api_keys_v2')
        .update({ 
            revoked: true, 
            revoked_at: new Date().toISOString(),
            revoked_by: userId,
            updated_at: new Date().toISOString(),
        })
        .eq('id', keyId)
        .eq('user_id', userId)
        .select('id')
        .maybeSingle();

    if (error || !data) return false;
    return true;
}

export async function rotateApiKey(userId: string, keyId: string): Promise<CreateApiKeyResponse> {
    const existing = await getApiKey(keyId);
    if (!existing || existing.userId !== userId) {
        throw new Error('API key not found');
    }

    await revokeApiKey(userId, keyId);

    return createApiKey(userId, {
        name: existing.name + ' (rotated)',
        scopes: existing.scopes,
    });
}

export async function updateApiKeyScopes(userId: string, keyId: string, scopes: string[]): Promise<void> {
    const { error } = await supabase
        .from('api_keys_v2')
        .update({ scopes, updated_at: new Date().toISOString() })
        .eq('id', keyId)
        .eq('user_id', userId);

    if (error) throw new Error(`Failed to update API key scopes: ${error.message}`);
}

export function getAvailableScopes(): ApiKeyScope[] {
    return API_KEY_SCOPES;
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
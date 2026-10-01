import { createClient } from '@supabase/supabase-js';
import { hashApiKey, generateApiKey, constantTimeCompare } from '../connector-v2/security/api-key-hash.ts';
import type { ApiKeyData, CreateApiKeyResponse } from './types.ts';

const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

function getPrefix(): string {
    return Deno.env.get('API_KEY_PREFIX') || 'vk';
}

function getDefaultExpiryDays(): number {
    return parseInt(Deno.env.get('API_KEY_DEFAULT_EXPIRY_DAYS') || '90', 10);
}

export async function rotateApiKey(userId: string, keyId: string): Promise<CreateApiKeyResponse> {
    const { data: existing, error: getError } = await supabase
        .from('api_keys_v2')
        .select('*')
        .eq('id', keyId)
        .eq('user_id', userId)
        .maybeSingle();

    if (getError || !existing) {
        throw new Error('API key not found');
    }

    await supabase
        .from('api_keys_v2')
        .update({ 
            revoked: true, 
            revoked_at: new Date().toISOString(),
            revoked_by: userId,
            updated_at: new Date().toISOString(),
        })
        .eq('id', keyId);

    const fullKey = generateApiKey(getPrefix());
    const keyHash = await hashApiKey(fullKey);
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + getDefaultExpiryDays() * 24 * 60 * 60 * 1000).toISOString();

    const newApiKey: ApiKeyData = {
        id: crypto.randomUUID(),
        userId,
        name: existing.name + ' (rotated)',
        prefix: getPrefix(),
        keyHash,
        scopes: existing.scopes || [],
        expiresAt,
        revoked: false,
        createdAt: now,
        updatedAt: now,
    };

    const { error: insertError } = await supabase.from('api_keys_v2').insert({
        id: newApiKey.id,
        user_id: newApiKey.userId,
        name: newApiKey.name,
        prefix: newApiKey.prefix,
        key_hash: newApiKey.keyHash,
        scopes: newApiKey.scopes,
        expires_at: newApiKey.expiresAt,
        revoked: newApiKey.revoked,
        created_at: newApiKey.createdAt,
        updated_at: newApiKey.updatedAt,
    });

    if (insertError) {
        throw new Error(`Failed to create rotated API key: ${insertError.message}`);
    }

    return {
        id: newApiKey.id,
        name: newApiKey.name,
        prefix: newApiKey.prefix,
        key: fullKey,
        scopes: newApiKey.scopes,
        expiresAt: newApiKey.expiresAt,
        createdAt: newApiKey.createdAt,
    };
}

export async function scheduleRotation(keyId: string, rotateAt: Date): Promise<void> {
    // This would be implemented with a background job system
    // For now, just a placeholder
    console.log(`Scheduled rotation for key ${keyId} at ${rotateAt.toISOString()}`);
}
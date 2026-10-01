import { createClient } from '@supabase/supabase-js';
import type { ApiKeyData } from './types.ts';

const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

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

export async function revokeAllUserApiKeys(userId: string): Promise<number> {
    const { data, error } = await supabase
        .from('api_keys_v2')
        .update({ 
            revoked: true, 
            revoked_at: new Date().toISOString(),
            revoked_by: userId,
            updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('revoked', false)
        .select('id');

    if (error) throw new Error(`Failed to revoke API keys: ${error.message}`);
    return data?.length || 0;
}

export async function revokeExpiredApiKeys(): Promise<number> {
    const { data, error } = await supabase
        .from('api_keys_v2')
        .update({ 
            revoked: true, 
            revoked_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
        .eq('revoked', false)
        .lt('expires_at', new Date().toISOString())
        .select('id');

    if (error) throw new Error(`Failed to revoke expired API keys: ${error.message}`);
    return data?.length || 0;
}
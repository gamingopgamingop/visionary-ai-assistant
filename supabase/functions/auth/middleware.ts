import { createClient } from '@supabase/supabase-js';
import type { AuthConfig, JWTPayload, UserIdentity, AuthResult } from './types.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

function getAuthConfig(): AuthConfig {
  return {
    enabled: Deno.env.get('NEW_AUTH_ENABLED') === 'true',
    provider: (Deno.env.get('AUTH_PROVIDER') as 'supabase' | 'clerk') || 'supabase',
    jwtSecret: Deno.env.get('SUPABASE_JWT_SECRET'),
    issuer: Deno.env.get('SUPABASE_JWT_ISSUER'),
    audience: Deno.env.get('SUPABASE_JWT_AUDIENCE'),
  };
}

async function validateSupabaseJWT(token: string): Promise<JWTPayload | null> {
  try {
    const config = getAuthConfig();
    
    if (!config.jwtSecret) {
      console.error('JWT secret not configured');
      return null;
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(config.jwtSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signature = parts[2];
    const data = encoder.encode(`${parts[0]}.${parts[1]}`);
    const sigBytes = Uint8Array.from(atob(signature.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
    
    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, data);
    
    if (!valid) {
      return null;
    }

    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return null;
    }

    if (config.issuer && payload.iss !== config.issuer) {
      return null;
    }

    if (config.audience && payload.aud !== config.audience) {
      return null;
    }

    return payload as JWTPayload;
  } catch (error) {
    console.error('JWT validation error:', error);
    return null;
  }
}

async function getUserProfile(userId: string): Promise<{ role: string; metadata: Record<string, unknown> } | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('role, metadata')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return { role: 'user', metadata: {} };
    }

    return { role: data.role, metadata: data.metadata || {} };
  } catch {
    return { role: 'user', metadata: {} };
  }
}

async function checkAccountStatus(userId: string): Promise<{ active: boolean; reason?: string }> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('status, banned_until')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return { active: true };
    }

    if (data.status === 'banned') {
      if (data.banned_until && new Date(data.banned_until) > new Date()) {
        return { active: false, reason: 'Account temporarily banned' };
      }
      return { active: false, reason: 'Account banned' };
    }

    if (data.status === 'suspended') {
      return { active: false, reason: 'Account suspended' };
    }

    return { active: true };
  } catch {
    return { active: true };
  }
}

export async function authenticateRequest(req: Request): Promise<AuthResult> {
  const config = getAuthConfig();

  if (!config.enabled) {
    return { success: false, error: 'New auth system disabled', errorCode: 'AUTH_DISABLED' };
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { success: false, error: 'Missing or invalid Authorization header', errorCode: 'MISSING_TOKEN' };
  }

  const token = authHeader.slice(7);
  
  if (config.provider === 'supabase') {
    const payload = await validateSupabaseJWT(token);
    
    if (!payload) {
      return { success: false, error: 'Invalid or expired token', errorCode: 'INVALID_TOKEN' };
    }

    const accountStatus = await checkAccountStatus(payload.sub);
    if (!accountStatus.active) {
      return { success: false, error: accountStatus.reason || 'Account inactive', errorCode: 'ACCOUNT_INACTIVE' };
    }

    const profile = await getUserProfile(payload.sub);
    
    const user: UserIdentity = {
      id: payload.sub,
      email: payload.email,
      role: profile.role,
      metadata: profile.metadata,
    };

    return { success: true, user };
  }

  return { success: false, error: 'Unsupported auth provider', errorCode: 'UNSUPPORTED_PROVIDER' };
}

export async function requireAuth(req: Request): Promise<UserIdentity> {
  const result = await authenticateRequest(req);
  
  if (!result.success || !result.user) {
    throw new Error(result.error || 'Authentication required');
  }
  
  return result.user;
}
import { createClient } from '@supabase/supabase-js';
import type { SecurityEventData, SecurityEventType } from './types.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

export async function logSecurityEvent(
  eventType: SecurityEventType,
  options: {
    userId?: string;
    success: boolean;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  const eventId = crypto.randomUUID();
  const now = new Date().toISOString();

  const { error } = await supabase.from('security_events').insert({
    id: eventId,
    user_id: options.userId,
    event_type: eventType,
    success: options.success,
    ip_address: options.ipAddress,
    user_agent: options.userAgent,
    metadata: options.metadata || {},
    created_at: now,
  });

  if (error) {
    console.error('Failed to log security event:', error);
  }
}

export async function getSecurityEvents(
  userId?: string,
  eventType?: SecurityEventType,
  limit: number = 100,
  offset: number = 0
): Promise<SecurityEventData[]> {
  let query = supabase
    .from('security_events')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (userId) {
    query = query.eq('user_id', userId);
  }

  if (eventType) {
    query = query.eq('event_type', eventType);
  }

  const { data, error } = await query;

  if (error || !data) return [];

  return data.map(e => ({
    id: e.id,
    userId: e.user_id,
    eventType: e.event_type,
    success: e.success,
    ipAddress: e.ip_address,
    userAgent: e.user_agent,
    metadata: e.metadata,
    createdAt: e.created_at,
  }));
}

export async function getFailedLoginAttempts(
  ipAddress: string,
  since: Date
): Promise<number> {
  const { count, error } = await supabase
    .from('security_events')
    .select('*', { count: 'exact', head: true })
    .eq('event_type', 'LOGIN_FAILED')
    .eq('ip_address', ipAddress)
    .gte('created_at', since.toISOString());

  if (error) return 0;
  return count || 0;
}

export async function isIpBlocked(ipAddress: string): Promise<boolean> {
  const since = new Date(Date.now() - 15 * 60 * 1000);
  const attempts = await getFailedLoginAttempts(ipAddress, since);
  return attempts >= 5;
}

export async function checkRateLimit(
  identifier: string,
  maxAttempts: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const since = new Date(Date.now() - windowMs);
  
  const { count, error } = await supabase
    .from('security_events')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', identifier)
    .gte('created_at', since.toISOString());

  if (error) {
    return { allowed: true, remaining: maxAttempts, resetAt: Date.now() + windowMs };
  }

  const used = count || 0;
  return {
    allowed: used < maxAttempts,
    remaining: Math.max(0, maxAttempts - used),
    resetAt: Date.now() + windowMs,
  };
}

export function sanitizeForLog(data: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = [
    'password', 'token', 'secret', 'key', 'authorization',
    'access_token', 'refresh_token', 'api_key', 'client_secret',
    'jwt', 'cookie', 'session', 'credit_card', 'ssn'
  ];

  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some(k => lowerKey.includes(k))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeForLog(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

export async function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const sigBytes = Uint8Array.from(atob(signature.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
    const data = encoder.encode(payload);
    
    return await crypto.subtle.verify('HMAC', key, sigBytes, data);
  } catch {
    return false;
  }
}

export async function generateSecureToken(length: number = 32): Promise<string> {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('');
}

export function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
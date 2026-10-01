import { createClient } from '@supabase/supabase-js';
import type { SessionData, DeviceData } from './types.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

export async function createSession(
  userId: string,
  deviceId: string | undefined,
  ipAddress: string | undefined,
  userAgent: string | undefined
): Promise<SessionData> {
  const sessionId = crypto.randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const session: SessionData = {
    id: sessionId,
    userId,
    deviceId,
    ipAddress,
    userAgent,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    lastActivityAt: now.toISOString(),
    revoked: false,
  };

  const { error } = await supabase.from('user_sessions').insert({
    id: session.id,
    user_id: session.userId,
    device_id: session.deviceId,
    ip_address: session.ipAddress,
    user_agent: session.userAgent,
    created_at: session.createdAt,
    expires_at: session.expiresAt,
    last_activity_at: session.lastActivityAt,
    revoked: session.revoked,
  });

  if (error) {
    throw new Error(`Failed to create session: ${error.message}`);
  }

  return session;
}

export async function getSession(sessionId: string): Promise<SessionData | null> {
  const { data, error } = await supabase
    .from('user_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    userId: data.user_id,
    deviceId: data.device_id,
    ipAddress: data.ip_address,
    userAgent: data.user_agent,
    createdAt: data.created_at,
    expiresAt: data.expires_at,
    lastActivityAt: data.last_activity_at,
    revoked: data.revoked,
  };
}

export async function validateSession(sessionId: string): Promise<{ valid: boolean; session?: SessionData; reason?: string }> {
  const session = await getSession(sessionId);
  
  if (!session) {
    return { valid: false, reason: 'Session not found' };
  }

  if (session.revoked) {
    return { valid: false, reason: 'Session revoked' };
  }

  if (new Date(session.expiresAt) < new Date()) {
    return { valid: false, reason: 'Session expired' };
  }

  return { valid: true, session };
}

export async function updateSessionActivity(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from('user_sessions')
    .update({ last_activity_at: new Date().toISOString() })
    .eq('id', sessionId);

  if (error) {
    throw new Error(`Failed to update session activity: ${error.message}`);
  }
}

export async function revokeSession(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from('user_sessions')
    .update({ revoked: true })
    .eq('id', sessionId);

  if (error) {
    throw new Error(`Failed to revoke session: ${error.message}`);
  }
}

export async function revokeAllUserSessions(userId: string, exceptSessionId?: string): Promise<void> {
  let query = supabase
    .from('user_sessions')
    .update({ revoked: true })
    .eq('user_id', userId)
    .eq('revoked', false);

  if (exceptSessionId) {
    query = query.neq('id', exceptSessionId);
  }

  const { error } = await query;

  if (error) {
    throw new Error(`Failed to revoke sessions: ${error.message}`);
  }
}

export async function getUserSessions(userId: string): Promise<SessionData[]> {
  const { data, error } = await supabase
    .from('user_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('revoked', false)
    .gt('expires_at', new Date().toISOString())
    .order('last_activity_at', { ascending: false });

  if (error || !data) return [];

  return data.map(s => ({
    id: s.id,
    userId: s.user_id,
    deviceId: s.device_id,
    ipAddress: s.ip_address,
    userAgent: s.user_agent,
    createdAt: s.created_at,
    expiresAt: s.expires_at,
    lastActivityAt: s.last_activity_at,
    revoked: s.revoked,
  }));
}

export async function registerDevice(
  userId: string,
  name: string | undefined,
  userAgent: string | undefined,
  ipAddress: string | undefined
): Promise<DeviceData> {
  const deviceId = crypto.randomUUID();
  const now = new Date();

  const device: DeviceData = {
    id: deviceId,
    userId,
    name,
    userAgent,
    ipAddress,
    lastSeenAt: now.toISOString(),
    trusted: false,
    revoked: false,
  };

  const { error } = await supabase.from('user_devices').insert({
    id: device.id,
    user_id: device.userId,
    name: device.name,
    user_agent: device.userAgent,
    ip_address: device.ipAddress,
    last_seen_at: device.lastSeenAt,
    trusted: device.trusted,
    revoked: device.revoked,
  });

  if (error) {
    throw new Error(`Failed to register device: ${error.message}`);
  }

  return device;
}

export async function getDevice(deviceId: string): Promise<DeviceData | null> {
  const { data, error } = await supabase
    .from('user_devices')
    .select('*')
    .eq('id', deviceId)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    userId: data.user_id,
    name: data.name,
    userAgent: data.user_agent,
    ipAddress: data.ip_address,
    lastSeenAt: data.last_seen_at,
    trusted: data.trusted,
    revoked: data.revoked,
  };
}

export async function updateDeviceLastSeen(deviceId: string): Promise<void> {
  const { error } = await supabase
    .from('user_devices')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('id', deviceId);

  if (error) {
    throw new Error(`Failed to update device: ${error.message}`);
  }
}

export async function revokeDevice(deviceId: string): Promise<void> {
  const { error } = await supabase
    .from('user_devices')
    .update({ revoked: true })
    .eq('id', deviceId);

  if (error) {
    throw new Error(`Failed to revoke device: ${error.message}`);
  }
}

export async function getUserDevices(userId: string): Promise<DeviceData[]> {
  const { data, error } = await supabase
    .from('user_devices')
    .select('*')
    .eq('user_id', userId)
    .eq('revoked', false)
    .order('last_seen_at', { ascending: false });

  if (error || !data) return [];

  return data.map(d => ({
    id: d.id,
    userId: d.user_id,
    name: d.name,
    userAgent: d.user_agent,
    ipAddress: d.ip_address,
    lastSeenAt: d.last_seen_at,
    trusted: d.trusted,
    revoked: d.revoked,
  }));
}

export async function trustDevice(deviceId: string): Promise<void> {
  const { error } = await supabase
    .from('user_devices')
    .update({ trusted: true })
    .eq('id', deviceId);

  if (error) {
    throw new Error(`Failed to trust device: ${error.message}`);
  }
}
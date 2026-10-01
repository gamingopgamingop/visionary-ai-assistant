import { createClient } from '@supabase/supabase-js';
import type { DeviceData } from './types.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

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

export async function updateDevice(
  deviceId: string,
  updates: { name?: string; trusted?: boolean }
): Promise<void> {
  const { error } = await supabase
    .from('user_devices')
    .update(updates)
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

export async function trustDevice(deviceId: string): Promise<void> {
  const { error } = await supabase
    .from('user_devices')
    .update({ trusted: true })
    .eq('id', deviceId);

  if (error) {
    throw new Error(`Failed to trust device: ${error.message}`);
  }
}

export async function updateDeviceLastSeen(deviceId: string): Promise<void> {
  const { error } = await supabase
    .from('user_devices')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('id', deviceId);

  if (error) {
    throw new Error(`Failed to update device last seen: ${error.message}`);
  }
}

export async function getTrustedDevices(userId: string): Promise<DeviceData[]> {
  const { data, error } = await supabase
    .from('user_devices')
    .select('*')
    .eq('user_id', userId)
    .eq('revoked', false)
    .eq('trusted', true)
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
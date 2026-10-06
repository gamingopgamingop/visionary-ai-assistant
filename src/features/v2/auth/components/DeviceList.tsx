import React, { useState } from 'react';
import { useDevicesV2, DeviceDataV2 } from '../hooks/useAuthV2';
import { LoadingState, EmptyState, ErrorDisplay } from '../../../shared/components';

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(dateString).toLocaleDateString();
}

function parseUserAgent(userAgent?: string): { browser: string; os: string; device: string } {
  if (!userAgent) return { browser: 'Unknown', os: 'Unknown', device: 'Unknown' };
  
  const ua = userAgent.toLowerCase();
  
  let browser = 'Unknown';
  if (ua.includes('edg/')) browser = 'Edge';
  else if (ua.includes('chrome') && !ua.includes('edg')) browser = 'Chrome';
  else if (ua.includes('firefox')) browser = 'Firefox';
  else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari';
  else if (ua.includes('opera') || ua.includes('opr/')) browser = 'Opera';
  
  let os = 'Unknown';
  if (ua.includes('windows')) os = 'Windows';
  else if (ua.includes('mac os') || ua.includes('macos')) os = 'macOS';
  else if (ua.includes('linux')) os = 'Linux';
  else if (ua.includes('android')) os = 'Android';
  else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';
  
  let device = 'Desktop';
  if (ua.includes('mobile') || ua.includes('android') && !ua.includes('tablet')) device = 'Mobile';
  else if (ua.includes('tablet') || ua.includes('ipad')) device = 'Tablet';
  
  return { browser, os, device };
}

interface DeviceCardProps {
  device: DeviceDataV2;
  currentDeviceId?: string;
  onRevoke: (deviceId: string) => Promise<void>;
  onTrust: (deviceId: string) => Promise<void>;
  revokingIds: Set<string>;
  trustingIds: Set<string>;
}

function DeviceCard({ device, currentDeviceId, onRevoke, onTrust, revokingIds, trustingIds }: DeviceCardProps) {
  const isCurrent = device.id === currentDeviceId;
  const isRevoking = revokingIds.has(device.id);
  const isTrusting = trustingIds.has(device.id);
  const { browser, os, device: deviceType } = parseUserAgent(device.userAgent);
  const isExpired = new Date(device.lastSeenAt) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const handleRevoke = async () => {
    if (!window.confirm(`Remove "${device.name || 'this device'}"? You'll need to sign in again on this device.`)) {
      return;
    }
    await onRevoke(device.id);
  };

  const handleTrust = async () => {
    await onTrust(device.id);
  };

  return (
    <div 
      style={{ 
        padding: '1.25rem', 
        border: '1px solid #e5e7eb', 
        borderRadius: '0.5rem',
        backgroundColor: device.revoked ? '#f9fafb' : 'white',
        opacity: device.revoked ? 0.7 : 1,
        transition: 'all 0.15s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '0.5rem',
              backgroundColor: device.trusted ? '#dbeafe' : '#f3f4f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: device.trusted ? '#1d4ed8' : '#6b7280',
            }}
          >
            {deviceType === 'Mobile' ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="5" y="2" width="14" height="20" rx="2" />
                <path d="M12 18h.01" />
              </svg>
            ) : deviceType === 'Tablet' ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="4" y="2" width="16" height="20" rx="2" />
                <path d="M12 18h.01" />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <path d="M8 21h8" />
                <path d="M12 17v4" />
              </svg>
            )}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontWeight: 500, color: '#1f2937' }}>
                {device.name || `${browser} on ${os}`}
              </span>
              {device.current && (
                <span style={{ 
                  fontSize: '0.7rem', 
                  background: '#dbeafe', 
                  color: '#1d4ed8', 
                  padding: '0.125rem 0.375rem', 
                  borderRadius: '9999px' 
                }}>
                  Current
                </span>
              )}
              {device.trusted && (
                <span style={{ 
                  fontSize: '0.7rem', 
                  background: '#dbeafe', 
                  color: '#1d4ed8', 
                  padding: '0.125rem 0.375rem', 
                  borderRadius: '9999px' 
                }}>
                  Trusted
                </span>
              )}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              {browser} on {os} · {deviceType}
            </div>
          </div>
        </div>

        {device.revoked && (
          <span style={{ 
            fontSize: '0.7rem', 
            background: '#f3f4f6', 
            color: '#4b5563', 
            padding: '0.125rem 0.5rem', 
            borderRadius: '9999px' 
          }}>
            Removed
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
          Last seen: <span style={{ color: '#374151' }}>{formatRelativeTime(device.lastSeenAt)}</span>
        </div>
        {device.ipAddress && (
          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
            IP: <span style={{ color: '#374151', fontFamily: 'monospace' }}>{device.ipAddress}</span>
          </div>
        )}
      </div>

      <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {device.trusted && !device.revoked && !isCurrent && (
          <button
            onClick={() => {}}
            disabled
            style={{
              padding: '0.375rem 0.75rem',
              borderRadius: '0.375rem',
              backgroundColor: '#dbeafe',
              color: '#1d4ed8',
              border: '1px solid #bfdbfe',
              fontSize: '0.75rem',
              fontWeight: 500,
              cursor: 'not-allowed',
            }}
          >
            Trusted
          </button>
        )}
        
        {!device.trusted && !device.revoked && !isCurrent && (
          <button
            onClick={handleTrust}
            disabled={isTrusting}
            style={{
              padding: '0.375rem 0.75rem',
              borderRadius: '0.375rem',
              backgroundColor: '#dbeafe',
              color: '#1d4ed8',
              border: '1px solid #bfdbfe',
              fontSize: '0.75rem',
              fontWeight: 500,
              cursor: isTrusting ? 'not-allowed' : 'pointer',
              opacity: isTrusting ? 0.7 : 1,
            }}
          >
            {isTrusting ? 'Trusting...' : 'Mark as trusted'}
          </button>
        )}
        
        {!device.revoked && !isCurrent && (
          <button
            onClick={handleRevoke}
            disabled={isRevoking}
            style={{
              padding: '0.375rem 0.75rem',
              borderRadius: '0.375rem',
              backgroundColor: '#fef2f2',
              color: '#dc2626',
              border: '1px solid #fecaca',
              fontSize: '0.75rem',
              fontWeight: 500,
              cursor: isRevoking ? 'not-allowed' : 'pointer',
              opacity: isRevoking ? 0.7 : 1,
            }}
          >
            {isRevoking ? 'Removing...' : 'Remove'}
          </button>
        )}
        
        {isCurrent && (
          <span style={{ 
            padding: '0.375rem 0.75rem', 
            backgroundColor: '#dbeafe', 
            color: '#1d4ed8', 
            borderRadius: '0.375rem',
            fontSize: '0.75rem',
            fontWeight: 500,
          }}>
            This device
          </span>
        )}
        
        {device.revoked && (
          <span style={{ 
            padding: '0.375rem 0.75rem', 
            backgroundColor: '#f3f4f6', 
            color: '#4b5563', 
            borderRadius: '0.375rem',
            fontSize: '0.75rem',
            fontWeight: 500,
          }}>
            Removed
          </span>
        )}
      </div>
    </div>
  );
}

export function DeviceList({ className = '' }: { className?: string }) {
  const { devices, loading, error, refetch, revokeDevice, trustDevice } = useDevicesV2();
  const [revokingIds, setRevokingIds] = useState<Set<string>>(new Set());
  const [trustingIds, setTrustingIds] = useState<Set<string>>(new Set());

  const trustedDevices = devices.filter(d => d.trusted && !d.revoked);
  const untrustedDevices = devices.filter(d => !d.trusted && !d.revoked);
  const revokedDevices = devices.filter(d => d.revoked);

  const handleRevoke = async (deviceId: string) => {
    setRevokingIds(prev => new Set(prev).add(deviceId));
    try {
      await revokeDevice(deviceId);
    } finally {
      setRevokingIds(prev => { const next = new Set(prev); next.delete(deviceId); return next; });
    }
  };

  const handleTrust = async (deviceId: string) => {
    setTrustingIds(prev => new Set(prev).add(deviceId));
    try {
      await trustDevice(deviceId);
    } finally {
      setTrustingIds(prev => { const next = new Set(prev); next.delete(deviceId); return next; });
    }
  };

  if (loading) {
    return <LoadingState message="Loading devices..." />;
  }

  if (error) {
    return <ErrorDisplay error={error} onRetry={refetch} />;
  }

  if (devices.length === 0) {
    return (
      <EmptyState
        title="No devices"
        description="Your trusted devices will appear here after you sign in"
        icon={
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: '#9ca3af' }}>
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <path d="M8 21h8" />
            <path d="M12 17v4" />
          </svg>
        }
      />
    );
  }

  return (
    <div className={`v2-device-list ${className}`} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1f2937', margin: 0 }}>
          Trusted Devices ({trustedDevices.length + untrustedDevices.length})
        </h2>
        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
          {trustedDevices.length} trusted · {untrustedDevices.length} untrusted · {revokedDevices.length} removed
        </div>
      </div>

      {devices.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
          {devices.map(device => (
            <DeviceCard
              key={device.id}
              device={device}
              currentDeviceId={devices.find(d => d.current)?.id}
              onRevoke={async (id) => {
                setRevokingIds(prev => new Set(prev).add(id));
                try { await revokeDevice(id); }
                finally { setRevokingIds(prev => { const n = new Set(prev); n.delete(id); return n; }); }
              }}
              onTrust={async (id) => {
                setTrustingIds(prev => new Set(prev).add(id));
                try { await trustDevice(id); } 
                finally { setTrustingIds(prev => { const n = new Set(prev); n.delete(id); return n; }); }
              }}
              revokingIds={revokingIds}
              trustingIds={trustingIds}
            />
          ))}
        </div>
      )}

      {revokedDevices.length > 0 && (
        <details style={{ marginTop: '1rem', padding: '1rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem', background: '#f9fafb' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 500, color: '#6b7280' }}>
            Removed devices ({revokedDevices.length})
          </summary>
          <div style={{ marginTop: '0.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '0.75rem' }}>
            {revokedDevices.map(device => (
              <div key={device.id} style={{ padding: '0.75rem', background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.375rem', opacity: 0.6 }}>
                <div style={{ fontWeight: 500, color: '#4b5563' }}>
                  {device.name || `${parseUserAgent(device.userAgent).browser} on ${parseUserAgent(device.userAgent).os}`}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                  Last seen: {formatRelativeTime(device.lastSeenAt)} · Removed
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
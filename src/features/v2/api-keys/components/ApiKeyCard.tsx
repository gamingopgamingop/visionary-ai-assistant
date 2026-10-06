import React from 'react';
import { ApiKeyData } from '../services/apiKeysService';

interface ApiKeyCardProps {
  apiKey: ApiKeyData;
  onRevoke?: () => void;
  onRotate?: () => void;
  onEditScopes?: () => void;
}

export function ApiKeyCard({ apiKey, onRevoke, onRotate, onEditScopes }: ApiKeyCardProps) {
  const isExpired = apiKey.expiresAt && new Date(apiKey.expiresAt) <= new Date();
  const isRevoked = apiKey.revoked;
  const isActive = !isRevoked && !isExpired;

  const statusConfig = isActive
    ? { bg: '#dcfce7', color: '#166534', label: 'Active' }
    : isRevoked
    ? { bg: '#f3f4f6', color: '#4b5563', label: 'Revoked' }
    : { bg: '#fef3c7', color: '#92400e', label: 'Expired' };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatRelativeTime = (dateString?: string) => {
    if (!dateString) return 'Never used';
    const date = new Date(dateString);
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateString);
  };

  const daysUntilExpiry = apiKey.expiresAt
    ? Math.ceil((new Date(apiKey.expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000))
    : null;

  return (
    <div
      style={{
        padding: '1.25rem',
        border: '1px solid #e5e7eb',
        borderRadius: '0.75rem',
        background: isRevoked ? '#f9fafb' : 'white',
        opacity: isRevoked ? 0.7 : 1,
        transition: 'all 0.15s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '0.5rem',
              backgroundColor: isRevoked ? '#f3f4f6' : '#dbeafe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isRevoked ? '#9ca3af' : '#1d4ed8',
              flexShrink: 0,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
            </svg>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1f2937', margin: 0 }}>
                {apiKey.name}
              </h3>
              <span
                style={{
                  padding: '0.125rem 0.5rem',
                  borderRadius: '9999px',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  backgroundColor: statusConfig.bg,
                  color: statusConfig.color,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {statusConfig.label}
              </span>
            </div>
            <code style={{ fontFamily: 'monospace', fontSize: '0.875rem', color: '#6b7280' }}>
              {apiKey.prefix}••••••••••••
            </code>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
          Scopes ({apiKey.scopes.length})
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
          {apiKey.scopes.slice(0, 6).map(scope => (
            <span
              key={scope}
              style={{
                fontSize: '0.625rem',
                padding: '0.125rem 0.5rem',
                backgroundColor: '#f3f4f6',
                color: '#4b5563',
                borderRadius: '9999px',
                fontFamily: 'monospace',
              }}
            >
              {scope}
            </span>
          ))}
          {apiKey.scopes.length > 6 && (
            <span style={{ fontSize: '0.625rem', color: '#9ca3af' }}>
              +{apiKey.scopes.length - 6} more
            </span>
          )}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: '1.5rem',
          flexWrap: 'wrap',
          paddingTop: '1rem',
          borderTop: '1px solid #e5e7eb',
          fontSize: '0.75rem',
          color: '#6b7280',
          marginBottom: '1rem',
        }}
      >
        <div>
          <span style={{ color: '#9ca3af' }}>Created: </span>
          <span style={{ color: '#374151' }}>{formatDate(apiKey.createdAt)}</span>
        </div>
        <div>
          <span style={{ color: '#9ca3af' }}>Last used: </span>
          <span style={{ color: '#374151' }}>{formatRelativeTime(apiKey.lastUsedAt)}</span>
        </div>
        {apiKey.expiresAt && (
          <div>
            <span style={{ color: '#9ca3af' }}>Expires: </span>
            <span style={{ color: daysUntilExpiry !== null && daysUntilExpiry < 7 && daysUntilExpiry > 0 ? '#92400e' : '#374151' }}>
              {formatDate(apiKey.expiresAt)}
              {daysUntilExpiry !== null && daysUntilExpiry > 0 && daysUntilExpiry < 7 && ` (${daysUntilExpiry}d)`}
            </span>
          </div>
        )}
        {isRevoked && apiKey.revokedAt && (
          <div>
            <span style={{ color: '#9ca3af' }}>Revoked: </span>
            <span style={{ color: '#374151' }}>{formatDate(apiKey.revokedAt)}</span>
          </div>
        )}
      </div>

      {isActive && (
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          {onEditScopes && (
            <button
              onClick={onEditScopes}
              style={{
                padding: '0.375rem 0.75rem',
                borderRadius: '0.375rem',
                backgroundColor: '#f3f4f6',
                color: '#374151',
                border: '1px solid #d1d5db',
                fontSize: '0.75rem',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Edit Scopes
            </button>
          )}
          {onRotate && (
            <button
              onClick={onRotate}
              style={{
                padding: '0.375rem 0.75rem',
                borderRadius: '0.375rem',
                backgroundColor: '#fef3c7',
                color: '#92400e',
                border: '1px solid #fde68a',
                fontSize: '0.75rem',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Rotate
            </button>
          )}
          {onRevoke && (
            <button
              onClick={onRevoke}
              style={{
                padding: '0.375rem 0.75rem',
                borderRadius: '0.375rem',
                backgroundColor: '#fef2f2',
                color: '#dc2626',
                border: '1px solid #fecaca',
                fontSize: '0.75rem',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Revoke
            </button>
          )}
        </div>
      )}
    </div>
  );
}

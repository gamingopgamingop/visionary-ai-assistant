import React, { useState } from 'react';
import { ApiKeyData, CreateApiKeyResponse } from '../services/apiKeysService';
import { useApiKeysV2 } from '../hooks/useApiKeys';
import { Modal } from '../../shared/components';

interface ApiKeyRotationDialogProps {
  apiKey: ApiKeyData;
  onClose: () => void;
  onRotated?: (newKey: CreateApiKeyResponse) => void;
}

export function ApiKeyRotationDialog({ apiKey, onClose, onRotated }: ApiKeyRotationDialogProps) {
  const { rotateApiKey } = useApiKeysV2();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newKey, setNewKey] = useState<CreateApiKeyResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const handleRotate = async () => {
    setLoading(true);
    setError(null);

    const result = await rotateApiKey(apiKey.id);
    if (result.success && result.newKey) {
      setNewKey(result.newKey);
      onRotated?.(result.newKey);
    } else {
      setError(result.error || 'Failed to rotate API key');
    }
    setLoading(false);
  };

  const handleCopy = () => {
    if (newKey) {
      navigator.clipboard.writeText(newKey.key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (newKey) {
    return (
      <Modal isOpen={true} onClose={() => {}} title="Key Rotated Successfully" size="md" closeOnOverlayClick={false} closeOnEscape={false}>
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#dcfce7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
              color: '#166534',
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#166534', margin: '0 0 0.5rem' }}>
            Your new API key is ready
          </h3>
          <p style={{ color: '#dc2626', fontSize: '0.9375rem', fontWeight: 600, margin: '0 0 1.25rem' }}>
            ⚠️ Copy this key now. It will not be shown again.
          </p>
          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              padding: '1rem',
              backgroundColor: '#f9fafb',
              borderRadius: '0.5rem',
              border: '1px solid #d1d5db',
              marginBottom: '1rem',
            }}
          >
            <code
              style={{
                flex: 1,
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                wordBreak: 'break-all',
                textAlign: 'left',
                color: '#1f2937',
              }}
            >
              {newKey.key}
            </code>
            <button
              onClick={handleCopy}
              style={{
                padding: '0.375rem 0.75rem',
                backgroundColor: copied ? '#10b981' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                fontSize: '0.75rem',
                fontWeight: 500,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '0.625rem 1.5rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            I've saved my key securely
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={true} onClose={loading ? () => {} : onClose} title="Rotate API Key" size="md">
      <div style={{ padding: '0.5rem' }}>
        {error && (
          <div style={{ padding: '0.75rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.375rem', color: '#991b1b', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.5rem' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '0.5rem',
              backgroundColor: '#fef3c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#92400e',
              flexShrink: 0,
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          </div>
          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1f2937', margin: 0 }}>
              Rotate "{apiKey.name}"?
            </h3>
            <p style={{ color: '#6b7280', margin: '0.25rem 0 0', fontSize: '0.875rem' }}>
              A new key will be generated with the same scopes and expiration.
            </p>
          </div>
        </div>

        <div
          style={{
            padding: '1rem',
            backgroundColor: '#fef3c7',
            border: '1px solid #fde68a',
            borderRadius: '0.5rem',
            marginBottom: '1.5rem',
          }}
        >
          <p style={{ color: '#92400e', margin: 0, fontSize: '0.875rem' }}>
            <strong>Important:</strong> The current key will be immediately invalidated. Update any
            applications using the old key with the new key.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{
              padding: '0.625rem 1.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              background: 'white',
              color: '#374151',
              fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleRotate}
            disabled={loading}
            style={{
              padding: '0.625rem 1.5rem',
              backgroundColor: loading ? '#fcd34d' : '#d97706',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Rotating...' : 'Rotate Key'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

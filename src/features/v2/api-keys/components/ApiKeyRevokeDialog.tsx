import React, { useState } from 'react';
import { ApiKeyData } from '../services/apiKeysService';
import { useApiKeysV2 } from '../hooks/useApiKeys';
import { Modal } from '../../shared/components';

interface ApiKeyRevokeDialogProps {
  apiKey: ApiKeyData;
  onClose: () => void;
}

export function ApiKeyRevokeDialog({ apiKey, onClose }: ApiKeyRevokeDialogProps) {
  const { revokeApiKey } = useApiKeysV2();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);

    const result = await revokeApiKey(apiKey.id);
    if (result.success) {
      onClose();
    } else {
      setError(result.error || 'Failed to revoke API key');
    }
    setLoading(false);
  };

  return (
    <Modal isOpen={true} onClose={loading ? () => {} : onClose} title="Revoke API Key" size="md">
      <div style={{ padding: '0.5rem' }}>
        {error && (
          <div style={{ padding: '0.75rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.375rem', color: '#991b1b', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '0.5rem',
              backgroundColor: '#fef2f2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#dc2626',
              flexShrink: 0,
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1f2937', margin: 0 }}>
              Revoke "{apiKey.name}"?
            </h3>
            <p style={{ color: '#6b7280', margin: '0.25rem 0 0', fontSize: '0.875rem' }}>
              This action cannot be undone.
            </p>
          </div>
        </div>

        <div
          style={{
            padding: '1rem',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '0.5rem',
            marginBottom: '1.5rem',
          }}
        >
          <p style={{ color: '#991b1b', margin: 0, fontSize: '0.875rem' }}>
            Any applications using this key will immediately lose access. The key prefix{' '}
            <code style={{ fontFamily: 'monospace', backgroundColor: '#fee2e2', padding: '0.125rem 0.375rem', borderRadius: '0.25rem' }}>
              {apiKey.prefix}
            </code>{' '}
            will no longer authenticate.
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
            onClick={handleConfirm}
            disabled={loading}
            style={{
              padding: '0.625rem 1.5rem',
              backgroundColor: loading ? '#fca5a5' : '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Revoking...' : 'Revoke Key'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

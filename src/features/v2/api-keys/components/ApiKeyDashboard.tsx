import React, { useState, useEffect } from 'react';
import { apiClient } from '../../../shared/services/apiClient';
import { LoadingState, EmptyState, ErrorDisplay, Modal, RetryButton } from '../../../shared/components';

interface ApiKeyData {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  expiresAt?: string;
  lastUsedAt?: string;
  revoked: boolean;
  revokedAt?: string;
  createdAt: string;
}

interface CreateApiKeyRequest {
  name: string;
  scopes: string[];
  expiresInDays?: number;
}

interface CreateApiKeyResponse {
  id: string;
  name: string;
  prefix: string;
  key: string;
  scopes: string[];
  expiresAt?: string;
  createdAt: string;
}

interface ApiKeyScope {
  name: string;
  description: string;
  resource: string;
  action: string;
}

export function ApiKeyDashboard({ className = '' }: { className?: string }) {
  const [apiKeys, setApiKeys] = useState<ApiKeyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRotateModal, setShowRotateModal] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [rotatingId, setRotatingId] = useState<string | null>(null);

  const fetchApiKeys = useCallback(async () => {
    try {
      const res = await fetch('/v2/api-keys-v2', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setApiKeys(data);
      }
    } catch (err) {
      console.error('Failed to fetch API keys:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApiKeys();
  }, [fetchApiKeys]);

  const handleRevoke = async (keyId: string) => {
    if (!window.confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      return;
    }
    setRevokingId(keyId);
    try {
      const res = await fetch(`/v2/api-keys-v2/${keyId}/revoke`, { method: 'POST', credentials: 'include' });
      if (res.ok) {
        fetchApiKeys();
      }
    } catch (err) {
      console.error('Failed to revoke API key:', err);
    } finally {
      setRevokingId(null);
    }
  };

  const handleRotate = async (keyId: string) => {
    try {
      const res = await fetch(`/v2/api-keys-v2/${keyId}/rotate`, { method: 'POST', credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        // Show the new key in a modal
        alert(`New API Key: ${data.key}\n\nCopy this key now. It will not be shown again.`);
        fetchApiKeys();
      }
    } catch (err) {
      console.error('Failed to rotate API key:', err);
    }
  };

  const handleCreate = async (request: CreateApiKeyRequest) => {
    try {
      const res = await fetch('/v2/api-keys-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(request),
      });
      if (res.ok) {
        const data = await res.json();
        alert(`API Key created successfully!\n\nAPI Key: ${data.key}\n\nCopy this key now. It will not be shown again.`);
        fetchApiKeys();
        return true;
      }
    } catch (err) {
      console.error('Failed to create API key:', err);
    }
    return false;
  };

  if (loading) {
    return <LoadingState message="Loading API keys..." />;
  }

  if (error) {
    return <ErrorDisplay error={error} onRetry={fetchApiKeys} />;
  }

  const activeKeys = apiKeys.filter(k => !k.revoked);
  const revokedKeys = apiKeys.filter(k => k.revoked);

  return (
    <div className={`v2-api-key-dashboard ${className}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#1f2937', margin: '0 0 0.5rem' }}>
            API Keys
          </h1>
          <p style={{ color: '#6b7280', margin: 0 }}>
            Manage your API keys for programmatic access
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            padding: '0.625rem 1.25rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Create API Key
        </button>
      </div>

      {activeKeys.length === 0 && revokedKeys.length === 0 && (
        <EmptyState
          title="No API keys"
          description="Create your first API key to start using the API"
          action={{ label: 'Create API Key', onClick: () => setShowCreateModal(true) }}
          icon={
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: '#9ca3af' }}>
              <path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8l-5-5" />
              <line x1="14" y1="2" x2="14" y2="8" />
            </svg>
          }
        />
      )}

      <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.5rem', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f9fafb' }}>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Name</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Key</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Scopes</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Last Used</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Expires</th>
              <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {apiKeys.map(key => (
              <tr key={key.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '1rem', fontWeight: 500, color: '#1f2937' }}>{key.name}</td>
                <td style={{ padding: '1rem', fontFamily: 'monospace', fontSize: '0.875rem', color: '#374151' }}>
                  {key.prefix}••••••••
                </td>
                <td style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                    {key.scopes.slice(0, 3).map(scope => (
                      <span key={scope} style={{ fontSize: '0.625rem', padding: '0.125rem 0.375rem', backgroundColor: '#f3f4f6', color: '#4b5563', borderRadius: '9999px', textTransform: 'uppercase' }}>
                        {scope}
                      </span>
                    ))}
                    {key.scopes.length > 3 && (
                      <span style={{ fontSize: '0.625rem', color: '#9ca3af' }}>
                        +{key.scopes.length - 3} more
                      </span>
                    )}
                  </div>
                </td>
                <td style={{ padding: '1rem' }}>
                  <span style={{ 
                    padding: '0.25rem 0.5rem', 
                    borderRadius: '9999px', 
                    fontSize: '0.7rem', 
                    fontWeight: 600,
                    backgroundColor: key.revoked ? '#f3f4f6' : key.expiresAt && new Date(key.expiresAt) < new Date() ? '#fef3c7' : '#dcfce7',
                    color: key.revoked ? '#4b5563' : key.expiresAt && new Date(key.expiresAt) < new Date() ? '#92400e' : '#166534',
                  }}>
                    {key.revoked ? 'Revoked' : key.expiresAt && new Date(key.expiresAt) < new Date() ? 'Expired' : 'Active'}
                  </span>
                </td>
                <td style={{ padding: '1rem', color: '#6b7280', fontSize: '0.875rem' }}>
                  {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : 'Never'}
                </td>
                <td style={{ padding: '1rem', color: '#6b7280', fontSize: '0.875rem' }}>
                  {key.expiresAt ? new Date(key.expiresAt).toLocaleDateString() : 'Never'}
                </td>
                <td style={{ padding: '1rem', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => handleRotate(key.id)}
                      disabled={revoking || rotating}
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
                    <button
                      onClick={() => handleRevoke(key.id)}
                      disabled={revoking}
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
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreateModal && (
        <CreateApiKeyModal onClose={() => setShowCreateModal(false)} onSuccess={() => { fetchApiKeys(); setShowCreateModal(false); }} />
      )}
    </div>
  );
}

function CreateApiKeyModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [expiresInDays, setExpiresInDays] = useState<number>(90);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableScopes = [
    { name: 'connector.read', description: 'Read connector connections' },
    { name: 'connector.create', description: 'Create connector connections' },
    { name: 'connector.update', description: 'Update connector connections' },
    { name: 'connector.delete', description: 'Delete connector connections' },
    { name: 'github.repositories.read', description: 'Read GitHub repositories' },
    { name: 'github.repositories.write', description: 'Write GitHub repositories' },
    { name: 'github.issues.read', description: 'Read GitHub issues' },
    { name: 'github.issues.write', description: 'Write GitHub issues' },
    { name: 'google.gmail.read', description: 'Read Gmail' },
    { name: 'google.gmail.send', description: 'Send Gmail' },
    { name: 'google.drive.read', description: 'Read Google Drive' },
    { name: 'google.drive.write', description: 'Write Google Drive' },
    { name: 'ai.chat', description: 'AI chat completion' },
    { name: 'ai.completion', description: 'AI text completion' },
    { name: 'ai.embeddings', description: 'AI embeddings' },
    { name: 'admin.users.read', description: 'Read admin users' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || selectedScopes.length === 0) return;

    try {
      const res = await fetch('/v2/api-keys-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, scopes: selectedScopes, expiresInDays }),
      });

      if (res.ok) {
        const data = await res.json();
        alert(`API Key created!\n\nAPI Key: ${data.key}\n\nCopy this key now. It will not be shown again.`);
        onClose();
      } else {
        const data = await res.json();
        alert(data.error?.message || 'Failed to create API key');
      }
    } catch (err) {
      console.error('Failed to create API key:', err);
    }
  };

  const toggleScope = (scope: string) => {
    setSelectedScopes(prev => prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope]);
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Create API Key" size="lg">
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500' }}>Key Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My API Key"
              required
              style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500' }}>Scopes</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', maxHeight: '200px', overflow: 'auto', padding: '0.5rem', border: '1px solid #e5e7eb', borderRadius: '0.375rem' }}>
              {availableScopes.map(scope => (
                <label key={scope.name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', backgroundColor: selectedScopes.includes(scope.name) ? '#dbeafe' : 'transparent', borderRadius: '0.375rem', cursor: 'pointer', transition: 'all 0.15s' }}>
                  <input
                    type="checkbox"
                    checked={selectedScopes.includes(scope.name)}
                    onChange={() => setSelectedScopes(prev => prev.includes(scope.name) ? prev.filter(s => s !== scope.name) : [...prev, scope.name])}
                  />
                  <span style={{ fontWeight: 500, color: '#1f2937' }}>{scope.name}</span>
                  <span style={{ fontSize: '0.75rem', color: '#6b7280', marginLeft: 'auto' }}>{scope.description}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500' }}>Expiration (days)</label>
            <input
              type="number"
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(parseInt(e.target.value) || 90)}
              min={1}
              max={365}
              style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button type="button" onClick={onClose} style={{ padding: '0.625rem 1.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', background: 'white' }}>
              Cancel
            </button>
            <button type="submit" disabled={loading || !name.trim()} style={{ padding: '0.75rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.375rem', fontWeight: 500 }}>
              {loading ? 'Creating...' : 'Create API Key'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

export function ApiKeyCard({ key, onRevoke, onRotate }: { key: any; onRevoke: (id: string) => void; onRotate: (id: string) => void }) {
  return (
    <div style={{ padding: '1.25rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem', background: key.revoked ? '#f9fafb' : 'white', opacity: key.revoked ? 0.7 : 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1f2937', margin: '0 0 0.25rem' }}>
            {key.name}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
            <code style={{ fontFamily: 'monospace', fontSize: '0.875rem', color: '#374151' }}>
              {key.prefix}••••••••
            </code>
            <span style={{ 
              padding: '0.125rem 0.5rem', 
              borderRadius: '9999px', 
              fontSize: '0.7rem', 
              fontWeight: 600,
              backgroundColor: key.revoked ? '#f3f4f6' : key.expiresAt && new Date(key.expiresAt) < new Date() ? '#fef3c7' : '#dcfce7',
              color: key.revoked ? '#4b5563' : key.expiresAt && new Date(key.expiresAt) < new Date() ? '#92400e' : '#166534',
            }}>
              {key.revoked ? 'Revoked' : key.expiresAt && new Date(key.expiresAt) < new Date() ? 'Expired' : 'Active'}
            </span>
          </div>
        </div>

        <div style={{ marginBottom: '0.75rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
            Scopes
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
            {key.scopes.slice(0, 5).map(scope => (
              <span key={scope} style={{ 
                fontSize: '0.625rem', 
                padding: '0.125rem 0.5rem', 
                backgroundColor: '#f3f4f6', 
                color: '#4b5563', 
                borderRadius: '9999px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                {scope}
              </span>
            ))}
            {key.scopes.length > 5 && (
              <span style={{ fontSize: '0.625rem', color: '#9ca3af' }}>
                +{key.scopes.length - 5} more
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', paddingTop: '0.75rem', borderTop: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
            Created: <span style={{ color: '#374151' }}>{new Date(key.createdAt).toLocaleDateString()}</span>
          </div>
          {key.expiresAt && (
            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
              Expires: <span style={{ color: '#374151' }}>{new Date(key.expiresAt).toLocaleDateString()}</span>
            </div>
          )}
          {key.lastUsedAt && (
            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
              Last used: <span style={{ color: '#374151' }}>{new Date(key.lastUsedAt).toLocaleString()}</span>
            </div>
          )}
        </div>

        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button
            onClick={() => onRotate(key.id)}
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
          <button
            onClick={() => onRevoke(key.id)}
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
        </div>
      </div>
    </div>
  );
}

export function ApiKeyCreateDialog({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [expiresInDays, setExpiresInDays] = useState(90);
  const [loading, setLoading] = useState(false);

  const availableScopes = [
    { name: 'connector.read', description: 'Read connector connections' },
    { name: 'connector.create', description: 'Create connector connections' },
    { name: 'connector.update', description: 'Update connector connections' },
    { name: 'connector.delete', description: 'Delete connector connections' },
    { name: 'github.repositories.read', description: 'Read GitHub repositories' },
    { name: 'github.repositories.write', description: 'Write GitHub repositories' },
    { name: 'github.issues.read', description: 'Read GitHub issues' },
    { name: 'github.issues.write', description: 'Write GitHub issues' },
    { name: 'google.gmail.read', description: 'Read Gmail' },
    { name: 'google.gmail.send', description: 'Send Gmail' },
    { name: 'google.drive.read', description: 'Read Google Drive' },
    { name: 'google.drive.write', description: 'Write Google Drive' },
    { name: 'ai.chat', description: 'AI chat completion' },
    { name: 'ai.completion', description: 'AI text completion' },
    { name: 'ai.embeddings', description: 'AI embeddings' },
    { name: 'admin.users.read', description: 'Read admin users' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || selectedScopes.length === 0) return;

    // Submit to API
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Create API Key" size="lg">
      <form onSubmit={async (e) => { e.preventDefault(); }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500' }}>Key Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="My API Key" required style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500' }}>Scopes</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', maxHeight: '200px', overflow: 'auto', padding: '0.5rem', border: '1px solid #e5e7eb', borderRadius: '0.375rem' }}>
              {availableScopes.map(scope => (
                <label key={scope.name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', backgroundColor: selectedScopes.includes(scope.name) ? '#dbeafe' : 'transparent', borderRadius: '0.375rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={selectedScopes.includes(scope.name)} onChange={() => setSelectedScopes(prev => prev.includes(scope.name) ? prev.filter(s => s !== scope.name) : [...prev, scope.name])} />
                  <span style={{ fontWeight: 500, color: '#1f2937' }}>{scope.name}</span>
                  <span style={{ fontSize: '0.75rem', color: '#6b7280', marginLeft: 'auto' }}>{scope.description}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500' }}>Expiration (days)</label>
            <input type="number" value={expiresInDays} onChange={(e) => setExpiresInDays(parseInt(e.target.value) || 90)} min={1} max={365} style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button type="button" onClick={onClose} style={{ padding: '0.625rem 1.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', background: 'white' }}>
              Cancel
            </button>
            <button type="submit" disabled={!name.trim() || selectedScopes.length === 0} style={{ padding: '0.75rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.375rem', fontWeight: 500 }}>
              Create API Key
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

export function ApiKeyRevokeDialog({ key, onClose, onConfirm }: { key: any; onClose: () => void; onConfirm: () => void }) {
  return (
    <Modal isOpen={true} onClose={onClose} title="Revoke API Key" size="md">
      <div style={{ padding: '1rem', textAlign: 'center' }}>
        <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
          Are you sure you want to revoke <strong>{key.name}</strong>?
        </p>
        <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
          This action cannot be undone. The API key will be permanently invalidated.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <button onClick={onClose} style={{ padding: '0.625rem 1.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', background: 'white' }}>
            Cancel
          </button>
          <button onClick={onConfirm} style={{ padding: '0.75rem 2rem', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '0.375rem', fontWeight: 500 }}>
            Revoke Key
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function ApiKeyRotateDialog({ key, onClose, onConfirm }: { key: any; onClose: () => void; onConfirm: () => void }) {
  return (
    <Modal isOpen={true} onClose={onClose} title="Rotate API Key" size="md">
      <div style={{ padding: '1rem', textAlign: 'center' }}>
        <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
          This will revoke the current key and generate a new one for <strong>{key.name}</strong>.
        </p>
        <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
          The new key will have the same scopes and expiration. The old key will be immediately invalidated.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <button onClick={onClose} style={{ padding: '0.625rem 1.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', background: 'white' }}>
            Cancel
          </button>
          <button onClick={onConfirm} style={{ padding: '0.75rem 2rem', backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: '0.375rem', fontWeight: 500 }}>
            Rotate Key
          </button>
        </div>
      </div>
    </Modal>
  );
}
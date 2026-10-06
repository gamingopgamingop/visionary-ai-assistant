import React, { useState } from 'react';
import { useApiKeysV2, useApiKeysScopes } from '../hooks/useApiKeys';
import { ApiKeyData, CreateApiKeyResponse } from '../services/apiKeysService';
import { LoadingState, EmptyState, ErrorDisplay, Modal } from '../../shared/components';
import { ApiKeyCard } from './ApiKeyCard';
import { ApiKeyRevokeDialog } from './ApiKeyRevokeDialog';
import { ApiKeyRotationDialog } from './ApiKeyRotationDialog';

interface ApiKeyDashboardProps {
  className?: string;
}

export function ApiKeyDashboard({ className = '' }: ApiKeyDashboardProps) {
  const { apiKeys, loading, error, refetch } = useApiKeysV2();
  const { scopes: availableScopes, loading: scopesLoading } = useApiKeysScopes();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [revokingKey, setRevokingKey] = useState<ApiKeyData | null>(null);
  const [rotatingKey, setRotatingKey] = useState<ApiKeyData | null>(null);
  const [newKey, setNewKey] = useState<CreateApiKeyResponse | null>(null);

  const activeKeys = apiKeys.filter(k => !k.revoked && (!k.expiresAt || new Date(k.expiresAt) > new Date()));
  const expiredKeys = apiKeys.filter(k => !k.revoked && k.expiresAt && new Date(k.expiresAt) <= new Date());
  const revokedKeys = apiKeys.filter(k => k.revoked);

  const handleCreated = (key: CreateApiKeyResponse) => {
    setNewKey(key);
    refetch();
  };

  const handleRotated = (key: CreateApiKeyResponse) => {
    setNewKey(key);
    refetch();
  };

  if (loading) {
    return <LoadingState message="Loading API keys..." />;
  }

  if (error) {
    return <ErrorDisplay error={error} onRetry={refetch} />;
  }

  return (
    <div className={`v2-api-key-dashboard ${className}`} style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#1f2937', margin: '0 0 0.5rem' }}>
            API Keys
          </h1>
          <p style={{ color: '#6b7280', margin: 0 }}>
            Manage API keys for programmatic access
          </p>
        </div>
        <button
          onClick={() => setShowCreateDialog(true)}
          style={{
            padding: '0.625rem 1.25rem',
            borderRadius: '0.375rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            fontWeight: 500,
            fontSize: '0.875rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Create API Key
        </button>
      </div>

      {newKey && (
        <div style={{
          marginBottom: '1.5rem',
          padding: '1.5rem',
          backgroundColor: '#ecfdf5',
          border: '1px solid #6ee7b7',
          borderRadius: '0.75rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '0.5rem',
              backgroundColor: '#d1fae5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#065f46',
              flexShrink: 0,
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8l-5-5" />
                <line x1="14" y1="2" x2="14" y2="8" />
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#065f46', margin: '0 0 0.5rem' }}>
                API Key Created: {newKey.name}
              </h3>
              <p style={{ color: '#047857', fontSize: '0.875rem', margin: '0 0 1rem', fontWeight: 500 }}>
                ⚠️ Copy this key now. It will not be shown again.
              </p>
              <div style={{
                display: 'flex',
                gap: '0.75rem',
                alignItems: 'center',
                padding: '0.75rem',
                backgroundColor: 'white',
                borderRadius: '0.5rem',
                border: '1px solid #d1d5db',
                fontFamily: 'monospace',
                fontSize: '0.875rem',
              }}>
                <code style={{ flex: 1, overflowX: 'auto', whiteSpace: 'nowrap' }}>{newKey.key}</code>
                <button
                  onClick={() => navigator.clipboard.writeText(newKey.key)}
                  style={{
                    padding: '0.375rem 0.75rem',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  Copy
                </button>
              </div>
              <button
                onClick={() => setNewKey(null)}
                style={{
                  marginTop: '1rem',
                  padding: '0.375rem 0.75rem',
                  backgroundColor: 'transparent',
                  color: '#047857',
                  border: 'none',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                I've saved my key securely
              </button>
            </div>
          </div>
        </div>
      )}

      {apiKeys.length === 0 ? (
        <EmptyState
          title="No API keys"
          description="Create an API key to access the API programmatically"
          action={{ label: 'Create API Key', onClick: () => setShowCreateDialog(true) }}
        />
      ) : (
        <>
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1f2937', margin: '0 0 1rem' }}>
              Active Keys ({activeKeys.length})
            </h2>
            {activeKeys.length === 0 ? (
              <EmptyState title="No active keys" description="All keys have been revoked or expired" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {activeKeys.map(key => (
                  <ApiKeyCard
                    key={key.id}
                    apiKey={key}
                    onRevoke={() => setRevokingKey(key)}
                    onRotate={() => setRotatingKey(key)}
                  />
                ))}
              </div>
            )}
          </div>

          {expiredKeys.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1f2937', margin: '0 0 1rem' }}>
                Expired Keys ({expiredKeys.length})
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {expiredKeys.map(key => (
                  <ApiKeyCard
                    key={key.id}
                    apiKey={key}
                    onRevoke={() => setRevokingKey(key)}
                    onRotate={() => setRotatingKey(key)}
                  />
                ))}
              </div>
            </div>
          )}

          {revokedKeys.length > 0 && (
            <details style={{ padding: '1rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem', background: '#f9fafb' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 500, color: '#6b7280' }}>
                Revoked Keys ({revokedKeys.length})
              </summary>
              <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {revokedKeys.map(key => (
                  <ApiKeyCard key={key.id} apiKey={key} />
                ))}
              </div>
            </details>
          )}
        </>
      )}

      {showCreateDialog && (
        <ApiKeyCreateDialog
          onClose={() => setShowCreateDialog(false)}
          onCreated={handleCreated}
        />
      )}

      {revokingKey && (
        <ApiKeyRevokeDialog
          apiKey={revokingKey}
          onClose={() => setRevokingKey(null)}
        />
      )}

      {rotatingKey && (
        <ApiKeyRotationDialog
          apiKey={rotatingKey}
          onClose={() => setRotatingKey(null)}
          onRotated={handleRotated}
        />
      )}
    </div>
  );
}

function ApiKeyCreateDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (key: CreateApiKeyResponse) => void }) {
  const { createApiKey } = useApiKeysV2();
  const { scopes: availableScopes, loading: scopesLoading } = useApiKeysScopes();
  const [name, setName] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [expiresInDays, setExpiresInDays] = useState(90);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const defaultScopes = [
    { name: 'connector.read', description: 'Read connector connections' },
    { name: 'connector.create', description: 'Create connector connections' },
    { name: 'connector.update', description: 'Update connector connections' },
    { name: 'connector.delete', description: 'Delete connector connections' },
    { name: 'github.repositories.read', description: 'Read GitHub repositories' },
    { name: 'github.repositories.write', description: 'Write GitHub repositories' },
    { name: 'github.issues.read', description: 'Read GitHub issues' },
    { name: 'github.issues.write', description: 'Write GitHub issues' },
    { name: 'github.pull_requests.read', description: 'Read GitHub pull requests' },
    { name: 'github.pull_requests.write', description: 'Write GitHub pull requests' },
    { name: 'google.gmail.read', description: 'Read Gmail' },
    { name: 'google.gmail.send', description: 'Send Gmail' },
    { name: 'google.drive.read', description: 'Read Google Drive' },
    { name: 'google.drive.write', description: 'Write Google Drive' },
    { name: 'google.calendar.read', description: 'Read Google Calendar' },
    { name: 'google.calendar.write', description: 'Write Google Calendar' },
    { name: 'ai.chat', description: 'AI chat completion' },
    { name: 'ai.completion', description: 'AI text completion' },
    { name: 'ai.embeddings', description: 'AI embeddings' },
    { name: 'admin.users.read', description: 'Read admin users' },
  ];

  const scopes = availableScopes.length > 0 ? availableScopes : defaultScopes;
  const filteredScopes = scopes.filter(scope =>
    scope.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    scope.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleScope = (scope: string) => {
    setSelectedScopes(prev =>
      prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || selectedScopes.length === 0) {
      setError('Please provide a name and select at least one scope');
      return;
    }

    setLoading(true);
    setError(null);

    const result = await createApiKey(name, selectedScopes, expiresInDays);
    if (result.success && result.apiKey) {
      onCreated(result.apiKey);
      onClose();
    } else {
      setError(result.error || 'Failed to create API key');
    }
    setLoading(false);
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Create API Key" size="lg">
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {error && (
            <div style={{ padding: '0.75rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.375rem', color: '#991b1b' }}>
              {error}
            </div>
          )}

          <div>
            <label htmlFor="apiKeyName" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#374151' }}>
              Key Name
            </label>
            <input
              id="apiKeyName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My API Key"
              required
              style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#374151' }}>
              Scopes ({selectedScopes.length} selected)
            </label>
            <input
              type="search"
              placeholder="Search scopes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', marginBottom: '0.5rem', fontSize: '0.875rem' }}
            />
            <div style={{ maxHeight: '240px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '0.375rem', padding: '0.5rem' }}>
              {scopesLoading ? (
                <LoadingState message="Loading scopes..." size="sm" />
              ) : filteredScopes.length === 0 ? (
                <p style={{ color: '#9ca3af', textAlign: 'center', padding: '1rem' }}>No scopes match your search</p>
              ) : (
                filteredScopes.map(scope => (
                  <label
                    key={scope.name}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem',
                      backgroundColor: selectedScopes.includes(scope.name) ? '#dbeafe' : 'transparent',
                      borderRadius: '0.375rem',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s',
                      marginBottom: '0.25rem',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedScopes.includes(scope.name)}
                      onChange={() => toggleScope(scope.name)}
                    />
                    <span style={{ fontWeight: 500, color: '#1f2937', fontFamily: 'monospace', fontSize: '0.875rem' }}>{scope.name}</span>
                    <span style={{ fontSize: '0.75rem', color: '#6b7280', marginLeft: 'auto' }}>{scope.description}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div>
            <label htmlFor="apiKeyExpiry" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: '#374151' }}>
              Expiration (days)
            </label>
            <input
              id="apiKeyExpiry"
              type="number"
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(parseInt(e.target.value) || 90)}
              min={1}
              max={365}
              style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }}
            />
            <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
              Key expires on {new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toLocaleDateString()}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button type="button" onClick={onClose} disabled={loading} style={{ padding: '0.625rem 1.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', background: 'white', cursor: 'pointer' }}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim() || selectedScopes.length === 0}
              style={{
                padding: '0.625rem 1.5rem',
                backgroundColor: loading || !name.trim() || selectedScopes.length === 0 ? '#93c5fd' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                fontWeight: 500,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Creating...' : 'Create API Key'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

export { ApiKeyCreateDialog };

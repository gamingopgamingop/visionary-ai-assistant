import React, { useState } from 'react';
import { ApiKeyData, ApiKeyScope } from '../services/apiKeysService';
import { useApiKeysV2, useApiKeysScopes } from '../hooks/useApiKeys';
import { Modal, LoadingState } from '../../shared/components';

interface ApiKeyScopeEditorProps {
  apiKey: ApiKeyData;
  onClose: () => void;
}

export function ApiKeyScopeEditor({ apiKey, onClose }: ApiKeyScopeEditorProps) {
  const { updateScopes } = useApiKeysV2();
  const { scopes: availableScopes, loading: scopesLoading } = useApiKeysScopes();
  const [selectedScopes, setSelectedScopes] = useState<string[]>(apiKey.scopes);
  const [saving, setSaving] = useState(false);
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
    { name: 'google.gmail.read', description: 'Read Gmail' },
    { name: 'google.gmail.send', description: 'Send Gmail' },
    { name: 'google.drive.read', description: 'Read Google Drive' },
    { name: 'google.drive.write', description: 'Write Google Drive' },
    { name: 'ai.chat', description: 'AI chat completion' },
    { name: 'ai.completion', description: 'AI text completion' },
    { name: 'ai.embeddings', description: 'AI embeddings' },
    { name: 'admin.users.read', description: 'Read admin users' },
  ];

  const scopes: ApiKeyScope[] = availableScopes.length > 0 ? availableScopes : defaultScopes;
  const filteredScopes = scopes.filter(scope =>
    scope.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    scope.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleScope = (scope: string) => {
    setSelectedScopes(prev =>
      prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    const result = await updateScopes(apiKey.id, selectedScopes);
    if (result.success) {
      onClose();
    } else {
      setError(result.error || 'Failed to update scopes');
    }
    setSaving(false);
  };

  const changed = JSON.stringify(selectedScopes.sort()) !== JSON.stringify([...apiKey.scopes].sort());

  return (
    <Modal isOpen={true} onClose={saving ? () => {} : onClose} title={`Edit Scopes — ${apiKey.name}`} size="lg">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {error && (
          <div style={{ padding: '0.75rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.375rem', color: '#991b1b' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ color: '#6b7280', margin: 0, fontSize: '0.875rem' }}>
            {selectedScopes.length} of {scopes.length} scopes selected
          </p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setSelectedScopes(scopes.map(s => s.name))}
              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Select all
            </button>
            <button
              onClick={() => setSelectedScopes([])}
              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Clear all
            </button>
          </div>
        </div>

        <input
          type="search"
          placeholder="Search scopes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
        />

        <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '0.375rem', padding: '0.5rem' }}>
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
                  marginBottom: '0.25rem',
                  transition: 'background-color 0.15s',
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedScopes.includes(scope.name)}
                  onChange={() => toggleScope(scope.name)}
                />
                <span style={{ fontWeight: 500, color: '#1f2937', fontFamily: 'monospace', fontSize: '0.875rem' }}>
                  {scope.name}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#6b7280', marginLeft: 'auto' }}>
                  {scope.description}
                </span>
              </label>
            ))
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '0.5rem', borderTop: '1px solid #e5e7eb' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            style={{
              padding: '0.625rem 1.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              background: 'white',
              color: '#374151',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !changed}
            style={{
              padding: '0.625rem 1.5rem',
              backgroundColor: saving || !changed ? '#93c5fd' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              fontWeight: 500,
              cursor: saving || !changed ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

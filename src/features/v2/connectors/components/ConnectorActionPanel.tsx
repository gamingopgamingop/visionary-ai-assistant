import React, { useState } from 'react';
import { ConnectorConfig } from '../../shared/types';

interface ConnectorActionPanelProps {
  connector: ConnectorConfig;
  onTest: () => void;
  onExecute: (action: string, params: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>;
  className?: string;
}

const ACTION_DESCRIPTIONS: Record<string, string> = {
  'test-auth': 'Validates credentials with the provider',
  'test-connection': 'Performs a live connectivity check',
  'validate-permissions': 'Confirms granted scopes are sufficient',
  'sample-actions': 'Runs a safe read-only sample call',
  getRepositories: 'List repositories for the authenticated user',
  getIssues: 'List issues in a repository',
  listMessages: 'List recent messages',
  listFiles: 'List stored files',
};

export function ConnectorActionPanel({ connector, onTest, onExecute, className = '' }: ConnectorActionPanelProps) {
  const actions = Object.entries(connector.endpoints || {});
  const [expandedAction, setExpandedAction] = useState<string | null>(null);
  const [params, setParams] = useState<Record<string, string>>({});
  const [executing, setExecuting] = useState<string | null>(null);
  const [result, setResult] = useState<{ action: string; success: boolean; message?: string } | null>(null);

  const handleExecute = async (action: string) => {
    setExecuting(action);
    setResult(null);
    try {
      const res = await onExecute(action, { query: params[action] || '' });
      setResult({
        action,
        success: res.success,
        message: res.success ? 'Action completed' : res.error,
      });
    } finally {
      setExecuting(null);
    }
  };

  return (
    <div className={`v2-connector-action-panel ${className}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1f2937', margin: 0 }}>
          Actions ({actions.length})
        </h2>
        <button
          onClick={onTest}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: 'white',
            color: '#3b82f6',
            border: '1px solid #bfdbfe',
            borderRadius: '0.375rem',
            fontWeight: 500,
            fontSize: '0.875rem',
            cursor: 'pointer',
          }}
        >
          Test Connection
        </button>
      </div>

      {result && (
        <div
          role="status"
          style={{
            padding: '0.75rem 1rem',
            borderRadius: '0.375rem',
            marginBottom: '1rem',
            backgroundColor: result.success ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${result.success ? '#bbf7d0' : '#fecaca'}`,
            color: result.success ? '#166534' : '#991b1b',
            fontSize: '0.875rem',
          }}
        >
          {result.success ? '✓' : '✗'} {result.action}: {result.message}
        </div>
      )}

      {actions.length === 0 ? (
        <div style={{ padding: '1.5rem', textAlign: 'center', color: '#6b7280', background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.5rem' }}>
          No actions defined for this connector.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {actions.map(([actionName, endpoint]) => {
            const expanded = expandedAction === actionName;
            return (
              <div key={actionName} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.5rem', overflow: 'hidden' }}>
                <button
                  onClick={() => setExpandedAction(expanded ? null : actionName)}
                  aria-expanded={expanded}
                  style={{
                    width: '100%',
                    padding: '0.875rem 1rem',
                    background: 'none',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '0.75rem',
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 600, color: '#1f2937', fontFamily: 'monospace', fontSize: '0.875rem' }}>
                      {actionName}
                    </span>
                    <span style={{ marginLeft: '0.75rem', fontSize: '0.75rem', color: '#6b7280' }}>
                      {endpoint.method} {endpoint.path}
                    </span>
                  </div>
                  <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>{expanded ? '▲' : '▼'}</span>
                </button>

                {expanded && (
                  <div style={{ padding: '0 1rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <p style={{ margin: 0, fontSize: '0.8125rem', color: '#6b7280' }}>
                      {endpoint.description || ACTION_DESCRIPTIONS[actionName] || 'Run this connector action'}
                    </p>
                    {endpoint.requiredPermissions && endpoint.requiredPermissions.length > 0 && (
                      <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                        {endpoint.requiredPermissions.map(perm => (
                          <span key={perm} style={{ fontSize: '0.65rem', padding: '0.125rem 0.5rem', backgroundColor: '#fef3c7', color: '#92400e', borderRadius: '9999px', fontFamily: 'monospace' }}>
                            {perm}
                          </span>
                        ))}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <input
                        type="text"
                        aria-label={`Query parameters for ${actionName}`}
                        placeholder="Query params (key=value, …)"
                        value={params[actionName] || ''}
                        onChange={(e) => setParams(prev => ({ ...prev, [actionName]: e.target.value }))}
                        style={{ flex: 1, minWidth: '200px', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem', fontFamily: 'monospace' }}
                      />
                      <button
                        onClick={() => handleExecute(actionName)}
                        disabled={executing === actionName}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: executing === actionName ? '#93c5fd' : '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '0.375rem',
                          fontWeight: 500,
                          fontSize: '0.875rem',
                          cursor: executing === actionName ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {executing === actionName ? 'Running…' : 'Execute'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

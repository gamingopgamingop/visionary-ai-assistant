import React, { useState } from 'react';
import { useConnectorsV2 } from '../hooks/useConnectorsV2';
import { LoadingState, EmptyState, ErrorDisplay } from '../../shared/components';
import { ConnectorConfig } from '../services/connectorService';

interface ConnectorDashboardProps {
  className?: string;
}

const CATEGORY_FILTERS = [
  'all',
  'development',
  'productivity',
  'communication',
  'storage',
  'payments',
  'project-management',
  'documentation',
  'integration',
];

export function ConnectorDashboard({ className = '' }: ConnectorDashboardProps) {
  const { connectors, loading, error, refetch } = useConnectorsV2();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const availableCategories = CATEGORY_FILTERS.filter(
    cat => cat === 'all' || connectors.some(c => c.category === cat)
  );

  const filteredConnectors = connectors.filter(connector => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      connector.name.toLowerCase().includes(q) ||
      connector.displayName.toLowerCase().includes(q) ||
      connector.description.toLowerCase().includes(q);
    const matchesCategory = selectedCategory === 'all' || connector.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return <LoadingState message="Loading connectors..." />;
  }

  if (error) {
    return <ErrorDisplay error={error} onRetry={refetch} />;
  }

  return (
    <div className={`v2-connector-dashboard ${className}`}>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#1f2937', margin: '0 0 0.5rem' }}>
              Connectors
            </h1>
            <p style={{ color: '#6b7280', margin: 0 }}>
              Connect external services to extend your AI assistant's capabilities
            </p>
          </div>
          <button
            onClick={refetch}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              fontWeight: 500,
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            Refresh
          </button>
        </div>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
            <input
              type="search"
              aria-label="Search connectors"
              placeholder="Search connectors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.625rem 0.875rem 0.625rem 2.5rem',
                borderRadius: '0.375rem',
                border: '1px solid #d1d5db',
                fontSize: '0.875rem',
              }}
            />
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }} role="group" aria-label="Filter by category">
            {availableCategories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: '0.375rem 0.875rem',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  backgroundColor: selectedCategory === cat ? '#3b82f6' : '#f3f4f6',
                  color: selectedCategory === cat ? 'white' : '#374151',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  textTransform: 'capitalize',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filteredConnectors.length === 0 ? (
        <EmptyState
          title={connectors.length === 0 ? 'No connectors available' : 'No matching connectors'}
          description={
            connectors.length === 0
              ? 'No connectors are registered or the connector engine is disabled.'
              : 'Try adjusting your search or category filters.'
          }
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {filteredConnectors.map(connector => (
            <ConnectorCard key={connector.id} connector={connector} />
          ))}
        </div>
      )}
    </div>
  );
}

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  active: { bg: '#dcfce7', color: '#166534', label: 'Connected' },
  pending: { bg: '#fef3c7', color: '#92400e', label: 'Pending' },
  error: { bg: '#fef2f2', color: '#991b1b', label: 'Error' },
  revoked: { bg: '#f3f4f6', color: '#4b5563', label: 'Revoked' },
  expired: { bg: '#fef3c7', color: '#92400e', label: 'Expired' },
};

export function ConnectorCard({ connector }: { connector: ConnectorConfig }) {
  const [testing, setTesting] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message?: string } | null>(null);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`/v2/connector-v2/connectors/${connector.id}/test`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({ success: true, message: data.message || 'Test passed' });
      } else {
        setTestResult({ success: false, message: data.error?.message || `Test failed (HTTP ${res.status})` });
      }
    } catch {
      setTestResult({ success: false, message: 'Network error — could not reach the test endpoint' });
    } finally {
      setTesting(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const res = await fetch('/v2/connector-v2/oauth/authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          connectorId: connector.id,
          redirectUri: window.location.origin + '/v2/connectors',
        }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.data?.authorizationUrl) {
        window.location.href = data.data.authorizationUrl;
      } else {
        alert(data.error?.message || `Failed to initiate connection (HTTP ${res.status})`);
      }
    } catch {
      alert('Network error — could not reach the OAuth endpoint');
    } finally {
      setConnecting(false);
    }
  };

  const status = connector.status || 'pending';
  const statusStyle = STATUS_STYLES[status] || STATUS_STYLES.pending;

  return (
    <div
      style={{
        background: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '0.75rem',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        transition: 'box-shadow 0.2s',
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '0.5rem',
              backgroundColor: '#dbeafe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#1d4ed8',
            }}
            aria-hidden="true"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </div>
          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1f2937', margin: '0 0 0.25rem' }}>
              {connector.displayName}
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0, textTransform: 'capitalize' }}>
              {connector.category} · {connector.authType}
            </p>
          </div>
        </div>
        <span
          style={{
            padding: '0.25rem 0.75rem',
            borderRadius: '9999px',
            fontSize: '0.7rem',
            fontWeight: 600,
            backgroundColor: statusStyle.bg,
            color: statusStyle.color,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {statusStyle.label}
        </span>
      </div>

      <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: '0 0 1.5rem', flex: 1 }}>
        {connector.description}
      </p>

      <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1rem' }}>
        {connector.requiredPermissions.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '1rem' }}>
            {connector.requiredPermissions.slice(0, 4).map(perm => (
              <span
                key={perm}
                style={{
                  fontSize: '0.625rem',
                  padding: '0.125rem 0.375rem',
                  backgroundColor: '#f3f4f6',
                  color: '#4b5563',
                  borderRadius: '9999px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontFamily: 'monospace',
                }}
              >
                {perm}
              </span>
            ))}
            {connector.requiredPermissions.length > 4 && (
              <span style={{ fontSize: '0.625rem', color: '#9ca3af' }}>
                +{connector.requiredPermissions.length - 4} more
              </span>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={handleTest}
            disabled={testing}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              backgroundColor: testing ? '#e5e7eb' : 'white',
              color: testing ? '#9ca3af' : '#3b82f6',
              border: '1px solid #d1d5db',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: testing ? 'not-allowed' : 'pointer',
              flex: 1,
            }}
          >
            {testing ? 'Testing…' : 'Test'}
          </button>

          {status === 'active' ? (
            <span
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                backgroundColor: '#dcfce7',
                color: '#166534',
                border: '1px solid #bbf7d0',
                fontSize: '0.875rem',
                fontWeight: 500,
                textAlign: 'center',
                flex: 1,
              }}
            >
              ✓ Connected
            </span>
          ) : (
            <button
              onClick={handleConnect}
              disabled={connecting}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                backgroundColor: connecting ? '#93c5fd' : '#3b82f6',
                color: 'white',
                border: 'none',
                fontWeight: 500,
                fontSize: '0.875rem',
                cursor: connecting ? 'not-allowed' : 'pointer',
                flex: 1,
              }}
            >
              {connecting ? 'Connecting…' : 'Connect'}
            </button>
          )}
        </div>

        {testResult && (
          <div
            role="status"
            style={{
              marginTop: '1rem',
              padding: '0.75rem',
              borderRadius: '0.375rem',
              backgroundColor: testResult.success ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${testResult.success ? '#bbf7d0' : '#fecaca'}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: testResult.success ? '#166534' : '#991b1b' }}>
              {testResult.success ? '✓' : '✗'}
              <span>{testResult.message}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function ConnectorsPage() {
  return (
    <div style={{ minHeight: '60vh' }}>
      <ConnectorDashboard />
    </div>
  );
}

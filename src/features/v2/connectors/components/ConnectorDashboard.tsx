import React, { useState, useEffect } from 'react';
import { useConnectorsV2, ConnectorConfig } from '../hooks/useConnectorsV2';
import { useConnectorOAuth } from '../hooks/useConnectorsV2';
import { LoadingState, EmptyState, ErrorDisplay, Modal } from '../../../shared/components';
import { ConnectorConfig as ConnectorConfigType } from '../../shared/types';

interface ConnectorDashboardProps {
  className?: string;
}

export function ConnectorDashboard({ className = '' }: { className?: string }) {
  const { connectors, loading, error, refetch, testConnection, executeAction } = useConnectorsV2();
  const { initiateOAuth } = useConnectorOAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [testingId, setTestingId] = useState<string | null>(null);
  const [connectingId, setConnectingId] = useState<string | null>(null);

  const categories = ['all', ...new Set(connectors.map(c => c.category))];

  const filteredConnectors = connectors.filter(connector => {
    const matchesSearch = connector.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         connector.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         connector.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || connector.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return <LoadingState message="Loading connectors..." />;
  }

  if (error) {
    return <ErrorDisplay error={error} onRetry={refetch} />;
  }

  const categoriesList = ['all', ...new Set(connectors.map(c => c.category))];

  return (
    <div className={`v2-connector-dashboard ${className}`}>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#1f2937', margin: '0 0 0.5rem' }}>
              Connectors
            </h1>
            <p style={{ color: '#6b7280', margin: 0 }}>
              Connect external services to extend your AI assistant's capabilities
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
            <input
              type="search"
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
              placeholder="Search connectors..."
            />
            <svg 
              width="18" 
              height="18" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
              style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {['all', ...new Set(['development', 'productivity', 'communication', 'storage', 'payments', 'project-management'])].map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                disabled={!enabledCategories.includes(cat)}
                style={{
                  padding: '0.375rem 0.875rem',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  backgroundColor: selectedCategory === cat ? '#3b82f6' : '#f3f4f6',
                  color: selectedCategory === cat ? 'white' : '#374151',
                  border: 'none',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  opacity: disabled ? 0.5 : 1,
                  transition: 'all 0.15s',
                }}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {connectors.length === 0 ? (
        <EmptyState
          title="No connectors available"
          description="No connectors match your current filters"
          icon={
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: '#9ca3af' }}>
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          }
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {filteredConnectors.map(connector => (
            <ConnectorCard
              key={connector.id}
              connector={connector}
              onTest={handleTest}
              onConnect={handleConnect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const enabledCategories = ['all', 'development', 'productivity', 'communication', 'storage', 'payments', 'project-management'];

function ConnectorCard({ 
  connector, 
  onTest, 
  onConnect 
}: { 
  connector: ConnectorConfigType; 
  onTest: (id: string) => Promise<void>;
  onConnect: (id: string) => Promise<void>;
}) {
  const [testing, setTesting] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message?: string } | null>(null);
  const [oauthUrl, setOauthUrl] = useState<string | null>(null);

  const handleTest = async () => {
    setTestResult({ success: false, message: 'Testing...' });
    try {
      const res = await fetch(`/v2/connector-v2/connectors/${connector.id}/test`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      setTestResult(data.success ? { success: true, message: data.message } : { success: false, message: data.error?.message });
    } catch {
      setTestResult({ success: false, message: 'Test failed' });
    }
  };

  const handleConnect = async () => {
    try {
      const res = await fetch('/v2/connector-v2/oauth/authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          connectorId: connector.id,
          redirectUri: window.location.origin + '/v2/connectors/callback',
        }),
      });
      const data = await res.json();
      if (data.success && data.data?.authorizationUrl) {
        window.location.href = data.data.authorizationUrl;
      }
    } catch {
      alert('Failed to initiate connection');
    }
  };

  const statusConfig = {
    active: { bg: '#dcfce7', color: '#166534', label: 'Connected' },
    pending: { bg: '#fef3c7', color: '#92400e', label: 'Pending' },
    error: { bg: '#fef2f2', color: '#991b1b', label: 'Error' },
    revoked: { bg: '#f3f4f6', color: '#4b5563', label: 'Revoked' },
    expired: { bg: '#fef3c7', color: '#92400e', label: 'Expired' },
  };

  const status = connector.status || 'pending';
  const statusConfig = statusConfig[status] || statusConfig.pending;

  return (
    <div style={{ 
      background: 'white', 
      border: '1px solid #e5e7eb', 
      borderRadius: '0.75rem', 
      padding: '1.5rem',
      display: 'flex',
      flexDirection: 'column',
      transition: 'box-shadow 0.2s',
      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
    }}>
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
            <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
              {connector.category}
            </p>
          </div>
        </div>
        <span style={{ 
          padding: '0.25rem 0.75rem', 
          borderRadius: '9999px', 
          fontSize: '0.7rem', 
          fontWeight: 600,
          backgroundColor: statusConfig.bg,
          color: statusConfig.color,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          {statusConfig.label}
        </span>
      </div>

      <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: '0 0 1.5rem', flex: 1 }}>
        {connector.description}
      </p>

      <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '1rem' }}>
          {connector.requiredPermissions.slice(0, 4).map(perm => (
            <span key={perm} style={{ 
              fontSize: '0.625rem', 
              padding: '0.125rem 0.375rem', 
              backgroundColor: '#f3f4f6', 
              color: '#4b5563', 
              borderRadius: '9999px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              {perm}
            </span>
          ))}
          {connector.requiredPermissions.length > 4 && (
            <span style={{ fontSize: '0.625rem', color: '#9ca3af' }}>
              +{connector.requiredPermissions.length - 4} more
          </span>
          )}
        </div>

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
              opacity: testing ? 0.7 : 1,
              flex: 1,
            }}
          >
            {testing ? 'Testing...' : 'Test'}
          </button>

          {connector.status === 'active' ? (
            <button
              onClick={() => {}}
              disabled
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                backgroundColor: '#dcfce7',
                color: '#166534',
                border: '1px solid #bbf7d0',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'not-allowed',
              }}
            >
              Connected
            </button>
          ) : (
            <button
              onClick={handleConnect}
              disabled={connecting}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                backgroundColor: connecting ? '#bfdbfe' : '#3b82f6',
                color: 'white',
                border: 'none',
                fontWeight: 500,
                cursor: connecting ? 'not-allowed' : 'pointer',
                opacity: connecting ? 0.7 : 1,
                flex: 1,
              }}
            >
              {connecting ? 'Connecting...' : 'Connect'}
            </button>
          )}
        </div>

        {testResult && (
          <div style={{ 
            marginTop: '1rem', 
            padding: '0.75rem', 
            borderRadius: '0.375rem',
            backgroundColor: testResult.success ? '#dcfce7' : '#fef2f2',
            border: `1px solid ${testResult.success ? '#bbf7d0' : '#fecaca'}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: testResult.success ? '#166534' : '#991b1b' }}>
              {testResult.success ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
              )}
              <span>{testResult.message || (testResult.success ? 'Test passed' : 'Test failed')}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function ConnectorsPage() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', padding: '2rem' }}>
      <ConnectorDashboard />
    </div>
  );
}
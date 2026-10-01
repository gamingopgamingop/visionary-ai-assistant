import React, { useState, useEffect } from 'react';
import { ConnectorConfigType } from '../../../shared/types';
import { LoadingState, EmptyState, ErrorDisplay, Modal, Tabs, TabList, Tab, TabPanels, TabPanel } from '../../../shared/components';
import { connectorServiceV2, ConnectorConfigType, ConnectorConnection } from '../services/connectorService';
import { useConnectorConnections, ConnectorConnection } from '../hooks/useConnectorsV2';
import { useConnectorPermissions, ConnectorConnection as ConnectionType } from '../hooks/useConnectorsV2';

interface ConnectorDetailsProps {
  connectorId: string;
  className?: string;
  onClose?: () => void;
}

export function ConnectorDetails({ connectorId, className = '', onClose }: ConnectorDetailsProps) {
  const [connector, setConnector] = useState<ConnectorConfigType | null>(null);
  const [connections, setConnections] = useState<ConnectorConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'connections' | 'permissions' | 'logs' | 'metrics'>('overview');
  const [selectedConnection, setSelectedConnection] = useState<ConnectorConnection | null>(null);
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [editingConnection, setEditingConnection] = useState<ConnectorConnection | null>(null);

  useEffect(() => {
    const fetchConnector = async () => {
      try {
        const res = await fetch(`/v2/connector-v2/connectors/${connectorId}`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setConnector(data);
        }
      } catch (err) {
        console.error('Failed to fetch connector:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchConnector();
  }, [connectorId]);

  useEffect(() => {
    const fetchConnections = async () => {
      try {
        const res = await fetch('/v2/connector-v2/connector/connections', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setConnections(data.filter((c: any) => c.connectorId === connectorId));
        }
      } catch (err) {
        console.error('Failed to fetch connections:', err);
      }
    };
    fetchConnections();
  }, [connectorId]);

  if (loading) {
    return <LoadingState message="Loading connector details..." />;
  }

  if (error) {
    return <ErrorDisplay error={error} onRetry={() => window.location.reload()} />;
  }

  if (!connector) {
    return <EmptyState title="Connector not found" description="The connector you're looking for doesn't exist" />;
  }

  return (
    <div className={`v2-connector-details ${className}`} style={{ maxWidth: '900px', margin: '0 auto' }}>
      <ConnectorHeader connector={connector} onClose={onClose} />
      
      <Tabs 
        activeTab={activeTab} 
        onChange={setActiveTab}
        style={{ marginTop: '1.5rem' }}
      >
        <TabList style={{ borderBottom: '1px solid #e5e7eb', marginBottom: '1.5rem' }}>
          <Tab id="overview" label="Overview" />
          <Tab id="connections" label="Connections" />
          <Tab id="permissions" label="Permissions" />
          <Tab id="actions" label="Actions" />
          <Tab id="logs" label="Logs" />
        </TabList>
        
        <TabPanel id="overview">
          <ConnectorOverview connector={connector} />
        </TabPanel>
        
        <TabPanel id="connections">
          <ConnectionsTab 
            connections={connections} 
            onAdd={handleAddConnection}
            onEdit={handleEditConnection}
            onDelete={handleDeleteConnection}
            onTest={handleTestConnection}
          />
        </TabPanel>
        
        <TabPanel id="permissions">
          <PermissionsTab connectorId={connector.id} />
        </TabPanel>
        
        <TabPanel id="actions">
          <ActionsTab connector={connector} />
        </TabPanel>
        
        <TabPanel id="logs">
          <LogsTab connectorId={connector.id} />
        </TabPanel>
      </Tabs>

      {showConnectionModal && (
        <ConnectionModal
          connector={connector}
          connection={editingConnection}
          onClose={() => { setShowConnectionModal(false); setEditingConnection(null); }}
          onSubmit={handleSubmitConnection}
        />
      )}
    </div>
  );
}

function ConnectorHeader({ connector, onClose }: { connector: any; onClose?: () => void }) {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'flex-start',
      padding: '1.5rem',
      background: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: '0.75rem',
      marginBottom: '1.5rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.5rem' }}>
        <div 
          style={{ 
            width: '64px', 
            height: '64px', 
            borderRadius: '0.75rem', 
            backgroundColor: '#dbeafe', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: '#1d4ed8',
          }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#1f2937', margin: 0 }}>
              {connector.displayName}
            </h1>
            <span style={{ 
              padding: '0.25rem 0.75rem', 
              backgroundColor: '#dbeafe', 
              color: '#1d4ed8', 
              borderRadius: '9999px', 
              fontSize: '0.75rem', 
              fontWeight: 500 
            }}>
              {connector.category}
            </span>
          </div>
          <p style={{ color: '#6b7280', margin: 0, fontSize: '1rem' }}>
            {connector.description}
          </p>
          <div style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {connector.requiredPermissions.slice(0, 5).map(perm => (
              <span key={perm} style={{ 
                fontSize: '0.7rem', 
                padding: '0.125rem 0.5rem', 
                backgroundColor: '#f3f4f6', 
                color: '#4b5563', 
                borderRadius: '9999px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                {perm}
              </span>
            ))}
            {connector.requiredPermissions.length > 5 && (
              <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                +{connector.requiredPermissions.length - 5} more
              </span>
            )}
          </div>
        </div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '0.375rem',
            backgroundColor: '#f3f4f6',
            color: '#374151',
            border: '1px solid #d1d5db',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Close
        </button>
      )}
    </div>
  );
}

function ConnectorOverview({ connector }: { connector: any }) {
  const statusConfig = {
    active: { bg: '#dcfce7', color: '#166534', label: 'Active' },
    pending: { bg: '#fef3c7', color: '#92400e', label: 'Pending Setup' },
    error: { bg: '#fef2f2', color: '#991b1b', label: 'Error' },
    revoked: { bg: '#f3f4f6', color: '#4b5563', label: 'Revoked' },
    expired: { bg: '#fef3c7', color: '#92400e', label: 'Expired' },
  };

  const status = connector.status || 'pending';
  const config = statusConfig[status] || statusConfig.pending;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1f2937', margin: '0 0 1rem' }}>
          Connector Information
        </h3>
        <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div>
            <dt style={{ fontSize: '0.75rem', fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Connector ID</dt>
            <dd style={{ fontFamily: 'monospace', fontSize: '0.875rem', color: '#1f2937', marginTop: '0.25rem' }}>{connector.id}</dd>
          </div>
          <div>
            <dt style={{ fontSize: '0.75rem', fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Version</dt>
            <dd style={{ fontSize: '0.875rem', color: '#1f2937', marginTop: '0.25rem' }}>{connector.version}</dd>
          </div>
          <div>
            <dt style={{ fontSize: '0.75rem', fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Base URL</dt>
            <dd style={{ fontFamily: 'monospace', fontSize: '0.875rem', color: '#1f2937', marginTop: '0.25rem' }}>{connector.baseUrl}</dd>
          </div>
          <div>
            <dt style={{ fontSize: '0.75rem', fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Auth Type</dt>
            <dd style={{ fontSize: '0.875rem', color: '#1f2937', marginTop: '0.25rem', textTransform: 'capitalize' }}>{connector.authType}</dd>
          </div>
          <div>
            <dt style={{ fontSize: '0.75rem', fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</dt>
            <dd style={{ marginTop: '0.25rem' }}>
              <span style={{ 
                padding: '0.25rem 0.75rem', 
                borderRadius: '9999px', 
                fontSize: '0.75rem', 
                fontWeight: 600,
                backgroundColor: connector.status === 'active' ? '#dcfce7' : '#fef3c7',
                color: connector.status === 'active' ? '#166534' : '#92400e',
              }}>
                {connector.status || 'pending'}
              </span>
            </dd>
          </div>
        </dl>
      </div>

      <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1f2937', margin: '0 0 1rem' }}>
          Required Permissions ({connector.requiredPermissions.length})
        </h3>
        {connector.requiredPermissions.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {connector.requiredPermissions.map(perm => (
              <span key={perm} style={{ 
                fontSize: '0.75rem', 
                padding: '0.25rem 0.75rem', 
                backgroundColor: '#f3f4f6', 
                color: '#374151', 
                borderRadius: '9999px',
                fontWeight: 500,
              }}>
                {perm}
              </span>
            ))}
          </div>
        ) : (
          <p style={{ color: '#9ca3af' }}>No required permissions</p>
        )}
      </div>

      {connector.optionalPermissions.length > 0 && (
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1f2937', margin: '0 0 1rem' }}>
            Optional Permissions ({connector.optionalPermissions.length})
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {connector.optionalPermissions.map(perm => (
              <span key={perm} style={{ 
                fontSize: '0.75rem', 
                padding: '0.25rem 0.75rem', 
                backgroundColor: '#f3f4f6', 
                color: '#6b7280', 
                borderRadius: '9999px',
              }}>
                {perm}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ConnectionsTab({ connections, onAdd, onEdit, onDelete, onTest }: { 
  connections: any[]; 
  onAdd: () => void;
  onEdit: (conn: any) => void;
  onDelete: (id: string) => void;
  onTest: (id: string) => void;
}) {
  if (connections.length === 0) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <p style={{ color: '#6b7280', margin: '0 0 1rem' }}>No connections yet</p>
        <button onClick={onAdd} style={{ padding: '0.5rem 1rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}>
          Add Connection
        </button>
      </div>
    );
  }

  return (
    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.5rem', overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: '#f9fafb' }}>
            <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Name</th>
            <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
            <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Auth Type</th>
            <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Last Used</th>
            <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {connections.map(conn => (
            <tr key={conn.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
              <td style={{ padding: '1rem', fontWeight: 500, color: '#1f2937' }}>{conn.name}</td>
              <td style={{ padding: '1rem' }}>
                <span style={{ padding: '0.25rem 0.5rem', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: 500' }}>
                  {conn.status}
                </span>
              </td>
              <td style={{ padding: '1rem', color: '#6b7280', fontSize: '0.875rem' }}>{conn.authType}</td>
              <td style={{ padding: '1rem', color: '#6b7280', fontSize: '0.875rem' }}>
                {conn.lastUsedAt ? new Date(conn.lastUsedAt).toLocaleString() : 'Never'}
              </td>
              <td style={{ padding: '1rem', textAlign: 'right' }}>
                <button onClick={() => {}} style={{ marginRight: '0.5rem', padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>Test</button>
                <button onClick={() => {}} style={{ marginRight: '0.5rem', padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>Edit</button>
                <button onClick={() => {}} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: '#dc2626' }}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PermissionsTab({ connectorId }: { connectorId: string }) {
  return <div style={{ padding: '1.5rem', textAlign: 'center', color: '#6b7280' }}>Permissions management coming soon</div>;
}

function ActionsTab({ connector }: { connector: any }) {
  return <div style={{ padding: '1.5rem', textAlign: 'center', color: '#6b7280' }}>Available actions coming soon</div>;
}

function LogsTab({ connectorId }: { connectorId: string }) {
  return <div style={{ padding: '1.5rem', textAlign: 'center', color: '#6b7280' }}>Connection logs coming soon</div>;
}

export function ConnectorTestDialog({ connector, onClose }: { connector: any; onClose: () => void }) {
  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`Test ${connector.displayName}`}
      size="md"
    >
      <div style={{ padding: '1rem', textAlign: 'center' }}>
        <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
          This will test the connection to {connector.displayName}.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <button onClick={onClose} style={{ padding: '0.5rem 1rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', background: 'white' }}>
            Cancel
          </button>
          <button onClick={onClose} style={{ padding: '0.5rem 1rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.375rem' }}>
            Run Test
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function ConnectionModal({ connector, connection, onClose, onSubmit }: { connector: any; connection: any; onClose: () => void; onSubmit: (data: any) => Promise<void> }) {
  return (
    <Modal isOpen={true} onClose={onClose} title={connection ? 'Edit Connection' : 'Add Connection'} size="md">
      <form onSubmit={async (e) => { e.preventDefault(); await onSubmit(new FormData(e.currentTarget)); }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500' }}>Connection Name</label>
            <input name="name" required style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '0.375rem' }} />
          </div>
          <div>
            <button type="submit" style={{ width: '100%', padding: '0.75rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.375rem' }}>
              {connection ? 'Save Changes' : 'Create Connection'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
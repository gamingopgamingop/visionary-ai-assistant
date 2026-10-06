import React, { useState } from 'react';
import { ConnectorConfigType, ConnectorConnection } from '../../../shared/types';
import { ActionButtonProps } from '../../../shared/types';

interface ConnectorActionPanelProps {
  connector: any;
  connection: any;
  onTest: () => void;
  onExecute: (action: string, params: Record<string, unknown>) => void;
  availableActions: string[];
}

export function ConnectorActionPanel({ 
  connector, 
  connection, 
  onTest, 
  onExecute,
  availableActions 
}: ConnectorActionPanelProps) {
  const [expandedAction, setExpandedAction] = useState<string | null>(null);
  const [actionParams, setActionParams] = useState<Record<string, Record<string, unknown>>>({});

  const actionLabels: Record<string, string> = {
    getUser: 'Get Current User',
    getRepositories: 'List Repositories',
    createRepository: 'Create Repository',
    getIssues: 'List Issues',
    createIssue: 'Create Issue',
    getPullRequests: 'List Pull Requests',
    createPullRequest: 'Create Pull Request',
    getCommits: 'List Commits',
    createWebhook: 'Create Webhook',
    getMessages: 'Get Messages',
    sendMessage: 'Send Message',
    getChannels: 'List Channels',
    createChannel: 'Create Channel',
    getEvents: 'List Events',
    createEvent: 'Create Event',
    getFiles: 'List Files',
    uploadFile: 'Upload File',
    getDatabases: 'List Databases',
    queryDatabase: 'Query Database',
    search: 'Search Pages',
    getCustomers: 'List Customers',
    createCustomer: 'Create Customer',
    getProducts: 'List Products',
    createProduct: 'Create Product',
    getSubscriptions: 'List Subscriptions',
    createPaymentIntent: 'Create Payment Intent',
  };

  const getActionDescription = (action: string): string => {
    const descriptions: Record<string, string> = {
      getUser: 'Retrieve information about the authenticated user',
      getRepositories: 'List all repositories accessible to the user',
      createRepository: 'Create a new repository',
      getIssues: 'List issues from repositories',
      createIssue: 'Create a new issue',
      getPullRequests: 'List pull requests',
      createPullRequest: 'Create a new pull request',
      getCommits: 'List commits from repositories',
      getMessages: 'Retrieve messages from channels',
      sendMessage: 'Send a message to a channel',
      getChannels: 'List channels in the workspace',
      createChannel: 'Create a new channel',
      getEvents: 'List calendar events',
      createEvent: 'Create a new calendar event',
      getFiles: 'List files in drive',
      uploadFile: 'Upload a file to drive',
      getDatabases: 'List Notion databases',
      queryDatabase: 'Query a Notion database',
      getCustomers: 'List Stripe customers',
      createCustomer: 'Create a new Stripe customer',
    };
    return descriptions[action] || 'Execute this action';
  };

  const getActionParams = (action: string) => {
    const paramMap: Record<string, { name: string; type: string; required: boolean; description: string }[]> = {
      getRepositories: [
        { name: 'type', type: 'string', required: false, description: 'all, owner, member' },
        { name: 'sort', type: 'string', required: false, description: 'created, updated, pushed, full_name' },
        { name: 'per_page', type: 'number', required: false, description: 'Results per page (max 100)' },
      ],
      createRepository: [
        { name: 'name', type: 'string', required: true, description: 'Repository name' },
        { name: 'description', type: 'string', required: false, description: 'Repository description' },
        { name: 'private', type: 'boolean', required: false, description: 'Make repository private' },
      ],
      createIssue: [
        { name: 'owner', type: 'string', required: true, description: 'Repository owner' },
        { name: 'repo', type: 'string', required: true, description: 'Repository name' },
        { name: 'title', type: 'string', required: true, description: 'Issue title' },
        { name: 'body', type: 'string', required: false, description: 'Issue description' },
      ],
      sendMessage: [
        { name: 'channel', type: 'string', required: true, description: 'Channel ID' },
        { name: 'text', type: 'string', required: true, description: 'Message text' },
      ],
      // Add more as needed
    };
    return paramMap[action] || [];
  };

  const handleExecute = async (action: string, params: Record<string, unknown>) => {
    setActionParams(prev => ({ ...prev, [action]: params }));
    try {
      await onExecute(action, params);
    } catch (err) {
      console.error('Action execution failed:', err);
    }
  };

  return (
    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1f2937', margin: 0 }}>
          Available Actions
        </h3>
        <button 
          onClick={onTest}
          style={{ 
            padding: '0.5rem 1rem', 
            backgroundColor: 'white', 
            color: '#3b82f6', 
            border: '1px solid #bfdbfe', 
            borderRadius: '0.375rem', 
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Test Connection
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
        {availableActions.map(action => {
          const isExpanded = expandedAction === action;
          const params = actionParams[action] || {};

          return (
            <ActionCard
              key={action}
              action={action}
              label={actionLabels[action] || action}
              description={getActionDescription(action)}
              expanded={expandedAction === action}
              onToggle={() => setExpandedAction(isExpanded ? null : action)}
              params={actionParams[action] || {}}
              onParamsChange={(p) => setActionParams(prev => ({ ...prev, [action]: p }))}
              onExecute={(params) => handleExecute(action, params)}
              actionParams={getActionParams(action)}
              executing={false}
            />
          ))}
        </div>

        <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
          <button 
            onClick={onTest}
            style={{ 
              padding: '0.5rem 1rem', 
              backgroundColor: 'white', 
              color: '#3b82f6', 
              border: '1px solid #bfdbfe', 
              borderRadius: '0.375rem', 
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Test Connection
          </button>
        </div>
      </div>
    </div>
  );
}

function ActionCard({ 
  action, 
  label, 
  description, 
  expanded, 
  onToggle, 
  params, 
  onParamsChange, 
  onExecute,
  actionParams,
  executing
}: { 
  action: string; 
  label: string; 
  description: string; 
  expanded: boolean; 
  onToggle: () => void; 
  params: Record<string, unknown>;
  onParamsChange: (params: Record<string, unknown>) => void;
  onExecute: (params: Record<string, unknown>) => void;
  actionParams: { name: string; type: string; required: boolean; description: string }[];
  executing: boolean;
}) {
  const [localParams, setLocalParams] = useState<Record<string, unknown>>({});

  useEffect(() => {
    setLocalParams(params);
  }, [params]);

  const handleParamChange = (name: string, value: unknown) => {
    const newParams = { ...localParams, [name]: value };
    setLocalParams(newParams);
    onParamsChange(newParams);
  };

  const handleExecute = () => {
    onExecute(localParams);
  };

  return (
    <div style={{ 
      border: '1px solid #e5e7eb', 
      borderRadius: '0.5rem', 
      padding: '1rem', 
      background: '#fafafa',
      transition: 'all 0.2s',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <div>
          <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1f2937', margin: '0 0 0.25rem' }}>
            {label}
          </h4>
          <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>
            {description}
          </p>
        </div>
        <button 
          onClick={onToggle}
          style={{ 
            padding: '0.25rem 0.5rem', 
            fontSize: '0.75rem', 
            color: '#3b82f6', 
            background: 'none', 
            border: 'none', 
            cursor: 'pointer' 
          }}
        >
          {expanded ? 'Hide Parameters' : 'Show Parameters'}
        </button>
      </div>

      {expanded && (
        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
          {actionParams.length === 0 ? (
            <button 
              onClick={() => onExecute({})}
              style={{ 
                width: '100%', 
                padding: '0.625rem', 
                backgroundColor: '#3b82f6', 
                color: 'white', 
                border: 'none', 
                borderRadius: '0.375rem', 
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Execute
            </button>
          ) : (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {actionParams.map(param => (
                <div key={param.name}>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', fontWeight: 500, color: '#374151' }}>
                    {param.name} {param.required && <span style={{ color: '#dc2626' }}> *</span>}
                  </label>
                  {param.type === 'boolean' ? (
                    <select
                      value={localParams[param.name] || ''}
                      onChange={(e) => handleParamChange(param.name, e.target.value === 'true')}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                    >
                      <option value="">Select...</option>
                      <option value="true">True</option>
                      <option value="false">False</option>
                    </select>
                  ) : param.type === 'number' ? (
                    <input
                      type="number"
                      name={param.name}
                      placeholder={param.description}
                      value={localParams[param.name] || ''}
                      onChange={(e) => handleParamChange(param.name, e.target.value ? parseFloat(e.target.value) : null)}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                    />
                  ) : (
                    <input
                      type="text"
                      name={param.name}
                      placeholder={param.description}
                      value={localParams[param.name] || ''}
                      onChange={(e) => handleParamChange(param.name, e.target.value)}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                    />
                  )}
                  {param.required && <p style={{ fontSize: '0.625rem', color: '#dc2626', marginTop: '0.125rem' }}>Required</p>}
                </div>
              ))}
              <button 
                onClick={() => onExecute({})}
                style={{ 
                  width: '100%', 
                  marginTop: '1rem', 
                  padding: '0.625rem', 
                  backgroundColor: '#3b82f6', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '0.375rem', 
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Execute
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function ConnectorTestButton({ connector, connection, onTest }: { connector: any; connection: any; onTest: () => void }) {
  return (
    <button 
      onClick={onTest}
      style={{ 
        padding: '0.5rem 1rem', 
        backgroundColor: 'white', 
        color: '#3b82f6', 
        border: '1px solid #bfdbfe', 
        borderRadius: '0.375rem', 
        fontWeight: 500,
        cursor: 'pointer',
      }}
    >
      Test Connection
    </button>
  );
}

export function ConnectorStatusBadge({ status }: { status: string }) {
  const statusConfig = {
    active: { bg: '#dcfce7', color: '#166534', label: 'Active' },
    pending: { bg: '#fef3c7', color: '#92400e', label: 'Pending' },
    error: { bg: '#fef2f2', color: '#991b1b', label: 'Error' },
    revoked: { bg: '#f3f4f6', color: '#4b5563', label: 'Revoked' },
    expired: { bg: '#fef3c7', color: '#92400e', label: 'Expired' },
  };

  const config = statusConfig[status] || { bg: '#f3f4f6', color: '#4b5563', label: status };

  return (
    <span style={{ 
      padding: '0.25rem 0.75rem', 
      borderRadius: '9999px', 
      fontSize: '0.7rem', 
      fontWeight: 600,
      backgroundColor: config.bg,
      color: config.color,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
    }}>
      {config.label}
    </span>
  );
}

export function ConnectorTypeBadge({ type }: { type: string }) {
  const typeColors: Record<string, { bg: string; color: string }> = {
    oauth2: { bg: '#dbeafe', color: '#1d4ed8' },
    api_key: { bg: '#dcfce7', color: '#166534' },
    bearer_token: { bg: '#fef3c7', color: '#92400e' },
    basic: { bg: '#f3f4f6', color: '#4b5563' },
    none: { bg: '#f3f4f6', color: '#6b7280' },
  };

  const config = typeColors[type] || { bg: '#f3f4f6', color: '#4b5563' };

  return (
    <span style={{ 
      padding: '0.125rem 0.5rem', 
      borderRadius: '9999px', 
      fontSize: '0.625rem', 
      fontWeight: 600,
      backgroundColor: config.bg,
      color: config.color,
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
    }}>
      {type.replace('_', ' ')}
    </span>
  );
}

export function ConnectorPermissionBadge({ permission }: { permission: string }) {
  return (
    <span style={{ 
      fontSize: '0.625rem', 
      padding: '0.125rem 0.5rem', 
      backgroundColor: '#f3f4f6', 
      color: '#4b5563', 
      borderRadius: '9999px',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
    }}>
      {permission}
    </span>
  );
}
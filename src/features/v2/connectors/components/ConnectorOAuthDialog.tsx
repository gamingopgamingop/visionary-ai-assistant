import React, { useState, useEffect } from 'react';
import { ConnectorConfigType } from '../../shared/types';
import { Modal, LoadingState, ErrorDisplay } from '../../shared/components';
import { connectorServiceV2 } from '../services/connectorService';

interface ConnectorOAuthDialogProps {
  connector: unknown;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (connectionId: string) => void;
}

export function ConnectorOAuthDialog({ connector, isOpen, onClose, onSuccess }: ConnectorOAuthDialogProps) {
  const [step, setStep] = useState<'initiate' | 'callback' | 'success'>('initiate');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authorizationUrl, setAuthorizationUrl] = useState<string | null>(null);
  const [state, setState] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStep('initiate');
      setError(null);
      setAuthorizationUrl(null);
    }
  }, [isOpen]);

  const handleInitiateOAuth = async () => {
    setLoading(true);
    setError(null);

    try {
      const redirectUri = `${window.location.origin}/v2/connectors/callback?connector=${connector.id}`;
      const response = await connectorServiceV2.initiateOAuth({
        connectorId: connector.id,
        redirectUri,
        scopes: connector.oauth2?.scopes || [],
      });

      if (response.success) {
        setAuthorizationUrl(response.data.authorizationUrl);
        setState(response.data.state);
        setStep('callback');
      } else {
        setError(response.error?.message || 'Failed to initiate OAuth');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initiate OAuth');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAuthUrl = () => {
    if (authorizationUrl) {
      // Store state in sessionStorage for callback verification
      sessionStorage.setItem(`oauth_state_${connector.id}`, state || '');
      window.location.href = authorizationUrl!;
    }
  };

  const handleCancel = () => {
    setStep('initiate');
    setAuthorizationUrl(null);
    setState(null);
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Connect ${connector.displayName}`}
      size="lg"
    >
      {step === 'initiate' && (
        <div style={{ padding: '1rem', textAlign: 'center' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ 
              width: '80px', 
              height: '80px', 
              borderRadius: '50%', 
              backgroundColor: '#dbeafe', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              margin: '0 auto 1rem',
              color: '#1d4ed8',
            }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1f2937', margin: '0 0 0.5rem' }}>
              Connect {connector.displayName}
            </h2>
            <p style={{ color: '#6b7280', margin: 0, maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' }}>
              This will open {connector.displayName}'s authorization page. You'll be asked to grant permissions, then redirected back here.
            </p>
          </div>

          {error && <ErrorDisplay error={new Error(error)} onDismiss={() => setError(null)} />}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '1.5rem' }}>
            <button onClick={onClose} disabled={loading} style={{ padding: '0.625rem 1.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', background: 'white' }}>
              Cancel
            </button>
            <button onClick={handleInitiateOAuth} disabled={loading} style={{ padding: '0.75rem 2rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.375rem', fontSize: '1rem' }}>
              {loading ? 'Initiating...' : 'Continue to Authorization'}
            </button>
          </div>
        </div>
      )}

      {step === 'callback' && (
        <div style={{ padding: '1rem', textAlign: 'center' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ 
              width: '80px', 
              height: '80px', 
              borderRadius: '50%', 
              backgroundColor: '#fef3c7', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              margin: '0 auto 1rem',
              color: '#92400e',
            }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="30 70" strokeLinecap="round">
                  <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite" />
                </circle>
              </svg>
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1f2937', margin: '0 0 0.5rem' }}>
              Waiting for Authorization
            </h2>
            <p style={{ color: '#6b7280', margin: '0 0 1.5rem', maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' }}>
              We've opened the authorization page in a new tab. Please complete the authorization, then click "I've Authorized" below.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '1rem' }}>
            <button onClick={handleCancel} style={{ padding: '0.625rem 1.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', background: 'white' }}>
              Cancel
            </button>
            <button onClick={handleOpenAuthUrl} style={{ padding: '0.75rem 2rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.375rem', fontSize: '1rem' }}>
              Open Authorization Page
            </button>
          </div>

          <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb' }}>
            <button onClick={handleOpenAuthUrl} style={{ padding: '0.75rem 2rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '0.375rem', fontSize: '1rem', width: '100%' }}>
              I've Authorized - Complete Connection
            </button>
            <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: '#6b7280' }}>
              Click this after you've completed the authorization on {connector.displayName}'s website.
            </p>
          </div>
        </div>
      )}

      {step === 'success' && (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <div style={{ 
            width: '80px', 
            height: '80px', 
            borderRadius: '50%', 
            backgroundColor: '#dcfce7', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            margin: '0 auto 1rem',
            color: '#166534',
          }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#1f2937', margin: '0 0 0.5rem' }}>
            Successfully Connected!
          </h2>
          <p style={{ color: '#6b7280', margin: '0 0 1.5rem' }}>
            {connector.displayName} has been successfully connected to your account.
          </p>
          <button onClick={onClose} style={{ padding: '0.75rem 2rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.375rem', fontSize: '1rem' }}>
            Done
          </button>
        </div>
      )}
    </Modal>
  );
}

export function ConnectorActionPanel({ 
  connector, 
  connection, 
  onTest, 
  onExecute,
  availableActions 
}: { 
  connector: unknown; 
  connection: unknown; 
  onTest: () => void;
  onExecute: (action: string, params: Record<string, unknown>) => void;
  availableActions: string[];
}) {
  return (
    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '1.5rem' }}>
      <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1f2937', margin: '0 0 1rem' }}>
        Available Actions
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
        {availableActions.map(action => (
          <ActionCard 
            key={action} 
            action={action} 
            connector={connector} 
            connection={connection}
            onExecute={onExecute}
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
  );
}

function ActionCard({ action, connector, connection, onExecute }: { action: string; connector: unknown; connection: unknown; onExecute: (action: string, params: Record<string, unknown>) => void }) {
  const [showParams, setShowParams] = useState(false);
  const [params, setParams] = useState<Record<string, unknown>>({});

  const actionLabels: Record<string, string> = {
    getUser: 'Get User',
    getRepositories: 'List Repositories',
    getIssues: 'List Issues',
    createIssue: 'Create Issue',
    getPullRequests: 'List Pull Requests',
    createPullRequest: 'Create Pull Request',
    getMessages: 'Get Messages',
    sendMessage: 'Send Message',
    getChannels: 'List Channels',
    createChannel: 'Create Channel',
    getEvents: 'List Events',
    createEvent: 'Create Event',
    getFiles: 'List Files',
    uploadFile: 'Upload File',
  };

  const label = actionLabels[action] || action;

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '1rem', background: '#fafafa' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <span style={{ fontWeight: 500, color: '#1f2937' }}>{label}</span>
        <button 
          onClick={() => setShowParams(!showParams)}
          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          {showParams ? 'Hide Parameters' : 'Show Parameters'}
        </button>
      </div>

      {showParams && (
        <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #e5e7eb' }}>
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {getActionParams(action).map(param => (
              <div key={param.name}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.75rem', fontWeight: 500, color: '#374151' }}>
                  {param.name} {param.required && <span style={{ color: '#dc2626' }}>*</span>}
                </label>
                <input
                  name={param.name}
                  type={param.type === 'number' ? 'number' : 'text'}
                  placeholder={param.description}
                  value={params[param.name] || ''}
                  onChange={(e) => setParams({ ...params, [param.name]: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                />
              </div>
            ))}
            <button 
              onClick={() => onExecute(action, params)}
              style={{ width: '100%', marginTop: '0.75rem', padding: '0.625rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.375rem', fontWeight: 500 }}
            >
              Execute {label}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function getActionParams(action: string): { name: string; type: string; required: boolean; description: string }[] {
  const paramMap: Record<string, { name: string; type: string; required: boolean; description: string }[]> = {
    getRepositories: [
      { name: 'type', type: 'string', required: false, description: 'all, owner, member' },
      { name: 'sort', type: 'string', required: false, description: 'created, updated, pushed, full_name' },
      { name: 'per_page', type: 'number', required: false, description: 'Results per page (max 100)' },
    ],
    createIssue: [
      { name: 'owner', type: 'string', required: true, description: 'Repository owner' },
      { name: 'repo', type: 'string', required: true, description: 'Repository name' },
      { name: 'title', type: 'string', required: true, description: 'Issue title' },
      { name: 'body', type: 'string', required: false, description: 'Issue description' },
    ],
    // Add more action params as needed
  };
  return paramMap[action] || [];
}

export function ConnectorTestButton({ connector, connection, onTest }: { connector: unknown; connection: unknown; onTest: () => void }) {
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
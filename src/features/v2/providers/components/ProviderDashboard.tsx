import React, { useState, useEffect, useCallback } from 'react';
import { aiGatewayServiceV2, ProviderConfig, ModelConfig, ProviderHealth } from '../../ai/services/aiGatewayService';
import { LoadingState, EmptyState, ErrorDisplay, Modal } from '../../shared/components';

interface ProviderDashboardProps {
  className?: string;
}

interface TestResult {
  providerId: string;
  success: boolean;
  statusCode?: number;
  latencyMs?: number;
  message: string;
  requestId?: string;
}

// Human-readable error messages per HTTP status (never raw internals)
function describeHttpStatus(status?: number): string {
  switch (status) {
    case 401: return 'Unauthorized — the provider API key is missing or invalid.';
    case 403: return 'Forbidden — the API key lacks permission for this resource.';
    case 404: return 'Model endpoint unavailable — the requested endpoint does not exist on this provider.';
    case 408: return 'Request timeout — the provider took too long to respond.';
    case 429: return 'Rate limited — too many requests to this provider. Try again shortly.';
    case 500: return 'Provider server error — the provider encountered an internal error.';
    case 502: return 'Bad gateway — the provider endpoint is unreachable.';
    case 503: return 'Service unavailable — the provider is temporarily down or overloaded.';
    case 504: return 'Gateway timeout — the provider did not respond in time.';
    default: return 'The provider request failed.';
  }
}

export function ProviderDashboard({ className = '' }: ProviderDashboardProps) {
  const [providers, setProviders] = useState<ProviderConfig[]>([]);
  const [models, setModels] = useState<ModelConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [testingProvider, setTestingProvider] = useState<ProviderConfig | null>(null);
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [runningTest, setRunningTest] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [providersRes, modelsRes] = await Promise.all([
        aiGatewayServiceV2.listProviders(true),
        aiGatewayServiceV2.listModels({ status: 'active' }),
      ]);

      if (providersRes.success && providersRes.data) {
        setProviders(providersRes.data);
      } else {
        setError(new Error(providersRes.error?.message || 'Failed to fetch providers'));
      }
      if (modelsRes.success && modelsRes.data) {
        setModels(modelsRes.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch providers'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleTestProvider = async (provider: ProviderConfig) => {
    setRunningTest(provider.id);
    const startTime = Date.now();
    try {
      const response = await aiGatewayServiceV2.checkProviderHealth(provider.id);
      const latencyMs = Date.now() - startTime;

      if (response.success && response.data) {
        const health = response.data;
        setTestResults(prev => ({
          ...prev,
          [provider.id]: {
            providerId: provider.id,
            success: health.status === 'healthy',
            latencyMs: health.latencyMs ?? latencyMs,
            message: health.status === 'healthy'
              ? 'Provider is healthy'
              : health.error || describeHttpStatus(),
            requestId: undefined,
          },
        }));
      } else {
        setTestResults(prev => ({
          ...prev,
          [provider.id]: {
            providerId: provider.id,
            success: false,
            statusCode: response.error?.statusCode,
            latencyMs,
            message: response.error?.statusCode
              ? describeHttpStatus(response.error.statusCode)
              : response.error?.message || 'Health check failed',
          },
        }));
      }
    } catch (err) {
      setTestResults(prev => ({
        ...prev,
        [provider.id]: {
          providerId: provider.id,
          success: false,
          latencyMs: Date.now() - startTime,
          message: err instanceof Error && err.name === 'AbortError'
            ? 'Request timeout — the provider did not respond in time.'
            : 'Failed to reach the provider health endpoint.',
        },
      }));
    } finally {
      setRunningTest(null);
    }
  };

  if (loading) return <LoadingState message="Loading AI providers..." />;

  if (error) return <ErrorDisplay error={error} onRetry={fetchData} />;

  return (
    <div className={`v2-provider-dashboard ${className}`} style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#1f2937', margin: '0 0 0.5rem' }}>
            AI Providers
          </h1>
          <p style={{ color: '#6b7280', margin: 0 }}>
            Provider health, models, and connectivity
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          style={{ padding: '0.625rem 1.25rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.375rem', fontWeight: 500, cursor: 'pointer' }}
        >
          Refresh
        </button>
      </div>

      {providers.length === 0 ? (
        <EmptyState
          title="No providers configured"
          description="No AI providers are configured. Add providers in the backend configuration to enable AI gateway routing."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Provider cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1rem' }}>
            {providers.map(provider => (
              <ProviderCard
                key={provider.id}
                provider={provider}
                modelCount={models.filter(m => m.providerId === provider.id).length}
                testResult={testResults[provider.id]}
                testing={runningTest === provider.id}
                onTest={() => handleTestProvider(provider)}
                onViewModels={() => setTestingProvider(provider)}
              />
            ))}
          </div>

          {/* Model table */}
          {models.length > 0 && (
            <section>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1f2937', margin: '0 0 1rem' }}>
                Model Registry
              </h2>
              <ModelTable models={models} providers={providers} />
            </section>
          )}
        </div>
      )}

      {/* Model detail modal */}
      {testingProvider && (
        <ProviderTestPanel
          provider={testingProvider}
          models={models.filter(m => m.providerId === testingProvider.id)}
          onClose={() => setTestingProvider(null)}
        />
      )}
    </div>
  );
}

function ProviderCard({
  provider,
  modelCount,
  testResult,
  testing,
  onTest,
  onViewModels,
}: {
  provider: ProviderConfig;
  modelCount: number;
  testResult?: TestResult;
  testing: boolean;
  onTest: () => void;
  onViewModels: () => void;
}) {
  const healthColors: Record<string, { bg: string; color: string }> = {
    healthy: { bg: '#dcfce7', color: '#166534' },
    degraded: { bg: '#fef3c7', color: '#92400e' },
    unhealthy: { bg: '#fef2f2', color: '#991b1b' },
    unknown: { bg: '#f3f4f6', color: '#6b7280' },
  };

  const health = testResult
    ? testResult.success ? 'healthy' : 'unhealthy'
    : 'unknown';
  const colors = healthColors[health];

  return (
    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.75rem', padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1f2937', margin: '0 0 0.25rem' }}>
            {provider.displayName}
          </h3>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.7rem', padding: '0.125rem 0.5rem', backgroundColor: '#f3f4f6', color: '#4b5563', borderRadius: '9999px', textTransform: 'uppercase' }}>
              {provider.type}
            </span>
            <span style={{
              fontSize: '0.7rem',
              padding: '0.125rem 0.5rem',
              backgroundColor: colors.bg,
              color: colors.color,
              borderRadius: '9999px',
              textTransform: 'uppercase',
              fontWeight: 600,
            }}>
              {health}
            </span>
            <span style={{ fontSize: '0.7rem', padding: '0.125rem 0.5rem', backgroundColor: '#f3f4f6', color: '#4b5563', borderRadius: '9999px' }}>
              {modelCount} model{modelCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <div style={{
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          backgroundColor: health === 'healthy' ? '#10b981' : health === 'unhealthy' ? '#ef4444' : '#9ca3af',
        }} aria-label={`Provider health: ${health}`} />
      </div>

      {/* Test result */}
      {testResult && (
        <div style={{
          padding: '0.75rem',
          borderRadius: '0.375rem',
          marginBottom: '1rem',
          backgroundColor: testResult.success ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${testResult.success ? '#bbf7d0' : '#fecaca'}`,
        }} role="status">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
            <span style={{ color: testResult.success ? '#166534' : '#991b1b', fontWeight: 600 }}>
              {testResult.success ? '✓' : '✗'}
            </span>
            <span style={{ color: testResult.success ? '#166534' : '#991b1b' }}>
              {testResult.message}
            </span>
          </div>
          {testResult.latencyMs !== undefined && (
            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
              Latency: {testResult.latencyMs}ms
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          onClick={onTest}
          disabled={testing}
          style={{
            flex: 1,
            padding: '0.5rem',
            borderRadius: '0.375rem',
            backgroundColor: testing ? '#e5e7eb' : 'white',
            color: testing ? '#9ca3af' : '#3b82f6',
            border: '1px solid #d1d5db',
            fontWeight: 500,
            fontSize: '0.875rem',
            cursor: testing ? 'not-allowed' : 'pointer',
          }}
        >
          {testing ? 'Testing…' : 'Test Provider'}
        </button>
        <button
          onClick={onViewModels}
          style={{
            flex: 1,
            padding: '0.5rem',
            borderRadius: '0.375rem',
            backgroundColor: '#f3f4f6',
            color: '#374151',
            border: '1px solid #d1d5db',
            fontWeight: 500,
            fontSize: '0.875rem',
            cursor: 'pointer',
          }}
        >
          View Models
        </button>
      </div>
    </div>
  );
}

export function ModelTable({ models, providers }: { models: ModelConfig[]; providers: ProviderConfig[] }) {
  if (models.length === 0) {
    return <EmptyState title="No models" description="No models registered for any provider" />;
  }

  const providerName = (id: string) => providers.find(p => p.id === id)?.displayName || id.slice(0, 8) + '…';

  return (
    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.75rem', overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <th style={headerStyle}>Model</th>
              <th style={headerStyle}>Provider</th>
              <th style={headerStyle}>Capabilities</th>
              <th style={headerStyle}>Context</th>
              <th style={headerStyle}>Status</th>
              <th style={headerStyle}>Health</th>
            </tr>
          </thead>
          <tbody>
            {models.map(model => (
              <tr key={model.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={cellStyle}>
                  <div style={{ fontWeight: 600, color: '#1f2937' }}>{model.displayName}</div>
                  <div style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: '#9ca3af' }}>{model.modelId}</div>
                </td>
                <td style={cellStyle}>{providerName(model.providerId)}</td>
                <td style={cellStyle}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                    {model.capabilities.slice(0, 4).map(cap => (
                      <span key={cap} style={{ fontSize: '0.625rem', padding: '0.125rem 0.375rem', backgroundColor: '#dbeafe', color: '#1d4ed8', borderRadius: '9999px', textTransform: 'capitalize' }}>
                        {cap}
                      </span>
                    ))}
                    {model.capabilities.length > 4 && (
                      <span style={{ fontSize: '0.625rem', color: '#9ca3af' }}>+{model.capabilities.length - 4}</span>
                    )}
                  </div>
                </td>
                <td style={{ ...cellStyle, whiteSpace: 'nowrap' }}>
                  {model.contextLength.toLocaleString()} tokens
                </td>
                <td style={cellStyle}>
                  <span style={{
                    padding: '0.125rem 0.5rem',
                    borderRadius: '9999px',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    backgroundColor: model.status === 'active' ? '#dcfce7' : '#fef3c7',
                    color: model.status === 'active' ? '#166534' : '#92400e',
                  }}>
                    {model.status}
                  </span>
                </td>
                <td style={cellStyle}>
                  <span style={{
                    padding: '0.125rem 0.5rem',
                    borderRadius: '9999px',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    backgroundColor: model.healthStatus === 'healthy' ? '#dcfce7' : model.healthStatus === 'degraded' ? '#fef3c7' : model.healthStatus === 'unhealthy' ? '#fef2f2' : '#f3f4f6',
                    color: model.healthStatus === 'healthy' ? '#166534' : model.healthStatus === 'degraded' ? '#92400e' : model.healthStatus === 'unhealthy' ? '#991b1b' : '#6b7280',
                  }}>
                    {model.healthStatus}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProviderTestPanel({ provider, models, onClose }: { provider: ProviderConfig; models: ModelConfig[]; onClose: () => void }) {
  return (
    <Modal isOpen={true} onClose={onClose} title={`${provider.displayName} — Models`} size="lg">
      <div>
        <p style={{ color: '#6b7280', margin: '0 0 1rem', fontSize: '0.875rem' }}>
          {models.length} model{models.length !== 1 ? 's' : ''} registered for this provider.
        </p>
        {models.length === 0 ? (
          <EmptyState title="No models" description="No models are registered for this provider." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {models.map(model => (
              <div key={model.id} style={{ padding: '1rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: '#1f2937' }}>{model.displayName}</div>
                    <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#6b7280' }}>{model.modelId}</div>
                  </div>
                  <span style={{
                    padding: '0.125rem 0.5rem',
                    borderRadius: '9999px',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    backgroundColor: model.healthStatus === 'healthy' ? '#dcfce7' : model.healthStatus === 'unhealthy' ? '#fef2f2' : '#f3f4f6',
                    color: model.healthStatus === 'healthy' ? '#166534' : model.healthStatus === 'unhealthy' ? '#991b1b' : '#6b7280',
                  }}>
                    {model.healthStatus}
                  </span>
                </div>
                <div style={{ marginTop: '0.5rem', display: 'flex', gap: '1rem', fontSize: '0.75rem', color: '#6b7280' }}>
                  <span>Context: {model.contextLength.toLocaleString()}</span>
                  {model.maxOutputTokens && <span>Max output: {model.maxOutputTokens.toLocaleString()}</span>}
                  {model.inputCostPer1kTokens && <span>In: ${model.inputCostPer1kTokens}/1k</span>}
                  {model.outputCostPer1kTokens && <span>Out: ${model.outputCostPer1kTokens}/1k</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

const headerStyle: React.CSSProperties = {
  padding: '0.75rem 1rem',
  textAlign: 'left',
  fontSize: '0.75rem',
  fontWeight: 600,
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const cellStyle: React.CSSProperties = {
  padding: '0.75rem 1rem',
  verticalAlign: 'middle',
  fontSize: '0.875rem',
  color: '#1f2937',
};

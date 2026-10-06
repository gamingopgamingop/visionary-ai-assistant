import React from 'react';
import { ProviderConfig } from '../services/aiGatewayService';

interface AIProviderSelectorProps {
  providers: ProviderConfig[];
  onSelect?: (provider: ProviderConfig) => void;
  className?: string;
}

export function AIProviderSelector({ providers, onSelect, className = '' }: AIProviderSelectorProps) {
  const enabledProviders = providers.filter(p => p.enabled);

  return (
    <div className={`v2-ai-provider-selector ${className}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1f2937', margin: 0 }}>
          AI Providers
        </h2>
        <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
          {enabledProviders.length} of {providers.length} enabled
        </span>
      </div>

      {providers.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280', background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.5rem' }}>
          No providers configured. Add providers in the backend AI provider registry.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {providers.map(provider => {
            const health = (provider as ProviderConfig & { healthStatus?: string }).healthStatus || 'unknown';
            const healthColors: Record<string, { bg: string; color: string }> = {
              healthy: { bg: '#dcfce7', color: '#166534' },
              degraded: { bg: '#fef3c7', color: '#92400e' },
              unhealthy: { bg: '#fef2f2', color: '#991b1b' },
              unknown: { bg: '#f3f4f6', color: '#6b7280' },
            };
            const colors = healthColors[health];
            return (
              <div
                key={provider.id}
                style={{
                  background: 'white',
                  border: `1px solid ${colors.bg}`,
                  borderRadius: '0.75rem',
                  padding: '1.25rem',
                  cursor: onSelect ? 'pointer' : 'default',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
                onClick={() => onSelect?.(provider)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1f2937', margin: '0 0 0.25rem' }}>
                      {provider.displayName}
                    </h3>
                    <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.65rem', padding: '0.125rem 0.5rem', backgroundColor: '#f3f4f6', color: '#4b5563', borderRadius: '9999px', textTransform: 'uppercase' }}>
                        {provider.type}
                      </span>
                      <span style={{ fontSize: '0.65rem', padding: '0.125rem 0.5rem', backgroundColor: colors.bg, color: colors.color, borderRadius: '9999px', textTransform: 'uppercase', fontWeight: 600 }}>
                        {health}
                      </span>
                    </div>
                  </div>
                  <div
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: health === 'healthy' ? '#10b981' : health === 'unhealthy' ? '#ef4444' : '#9ca3af',
                    }}
                    aria-label={`Health: ${health}`}
                  />
                </div>

                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  Priority: {provider.priority} · {provider.enabled ? 'Enabled' : 'Disabled'}
                </div>

                {onSelect && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onSelect(provider); }}
                    style={{
                      marginTop: 'auto',
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
                    Select Provider
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

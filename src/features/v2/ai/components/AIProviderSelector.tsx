import React, { useState, useEffect, useCallback } from 'react';
import { useAIProviders, ProviderConfig } from '../hooks/useAIGateway';
import { LoadingState, EmptyState, ErrorDisplay } from '../../shared/components';

interface AIProviderSelectorProps {
  value?: string;
  onChange: (providerId: string) => void;
  enabledOnly?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  showHealth?: boolean;
}

export function AIProviderSelector({
  value,
  onChange,
  enabledOnly = true,
  disabled = false,
  placeholder = 'Select a provider',
  className = '',
  showHealth = true,
}: {
  value?: string;
  onChange: (providerId: string) => void;
  enabledOnly?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  showHealth?: boolean;
}) {
  const { providers, loading, error, refetch, checkHealth } = useAIProviders();
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(value || null);

  useEffect(() => {
    if (value) setSelectedProvider(value);
  }, [value]);

  const filteredProviders = providers.filter(p => !enabledOnly || p.enabled);

  const handleSelect = (providerId: string) => {
    setSelectedProvider(providerId);
    setShowDropdown(false);
    onChange(providerId);
  };

  if (disabled) {
    return (
      <select value={value || ''} onChange={(e) => onChange(e.target.value)} disabled className={className} style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', backgroundColor: '#f3f4f6', color: '#9ca3af' }}>
        <option value="" disabled>{placeholder}</option>
        {providers.filter(p => !enabledOnly || p.enabled).map(p => (
          <option key={p.id} value={p.id}>{p.displayName}</option>
        ))}
      </select>
    );
  }

  return (
    <div className={`v2-ai-provider-selector ${className}`} style={{ position: 'relative', width: '100%' }}>
      <div style={{ position: 'relative' }}>
        <button
          type="button"
          onClick={() => setShowDropdown(!showDropdown)}
          disabled={loading}
          style={{
            width: '100%',
            padding: '0.625rem 2.5rem 0.625rem 0.875rem',
            borderRadius: '0.375rem',
            border: '1px solid #d1d5db',
            backgroundColor: 'white',
            textAlign: 'left',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.625rem 0.875rem',
            fontSize: '0.875rem',
          }}
          aria-haspopup="listbox"
          aria-expanded={showDropdown}
        >
          <span style={{ color: selectedProvider ? '#1f2937' : '#9ca3af' }}>
            {selectedProvider 
              ? providers.find(p => p.id === selectedProvider)?.displayName || selectedProvider
              : placeholder}
          </span>
          <svg 
            width="18" 
            height="18" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
            style={{ color: '#9ca3af', flexShrink: 0 }}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        {showDropdown && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, marginTop: '0.25rem', background: 'white', border: '1px solid #d1d5db', borderRadius: '0.375rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', maxHeight: '300px', overflow: 'auto' }}>
            <div style={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}>
              <input
                type="search"
                placeholder="Search providers..."
                onChange={(e) => e.target.value}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                autoFocus
              />
            </div>
            <div style={{ maxHeight: '250px', overflow: 'auto' }}>
              {providers.filter(p => !enabledOnly || p.enabled).map(provider => (
                <button
                  key={provider.id}
                  onClick={() => handleSelect(provider.id)}
                  style={{ width: '100%', padding: '0.625rem 0.875rem', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div style={{ 
                    width: '36px', 
                    height: '36px', 
                    borderRadius: '0.5rem', 
                    backgroundColor: provider.enabled ? '#dcfce7' : '#f3f4f6', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    color: provider.enabled ? '#166534' : '#9ca3af',
                  }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, color: '#1f2937', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {provider.displayName}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      {provider.type} · {provider.supportedModels.length} models
                    </div>
                  </div>
                  {showHealth && (
                    <span style={{ 
                      fontSize: '0.625rem', 
                      padding: '0.125rem 0.375rem', 
                      borderRadius: '9999px',
                      backgroundColor: provider.healthStatus === 'healthy' ? '#dcfce7' : provider.healthStatus === 'degraded' ? '#fef3c7' : provider.healthStatus === 'unhealthy' ? '#fef2f2' : '#f3f4f6',
                      color: provider.healthStatus === 'healthy' ? '#166534' : provider.healthStatus === 'degraded' ? '#92400e' : '#991b1b',
                      fontWeight: 500,
                      textTransform: 'capitalize',
                    }}>
                      {provider.healthStatus || 'unknown'}
                    </span>
                  )}
                </button>
              ))}
            )}
            {providers.filter(p => !enabledOnly || p.enabled).length === 0 && (
              <div style={{ padding: '1rem', textAlign: 'center', color: '#6b7280' }}>
                No providers available
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function AIProviderCard({ provider, onSelect, showHealth = true }: { provider: unknown; onSelect?: (id: string) => void; showHealth?: boolean }) {
  return (
    <div 
      style={{ 
        padding: '1.25rem', 
        border: '1px solid #e5e7eb', 
        borderRadius: '0.75rem', 
        background: 'white',
        cursor: onSelect ? 'pointer' : 'default',
        transition: 'all 0.2s',
      }}
      onClick={() => onSelect?.(provider.id)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div 
            style={{ 
              width: '48px', 
              height: '48px', 
              borderRadius: '0.5rem', 
              backgroundColor: provider.enabled ? '#dcfce7' : '#f3f4f6', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: provider.enabled ? '#166534' : '#6b7280',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </div>
          <div>
            <div style={{ fontWeight: 500, color: '#1f2937' }}>
              {provider.displayName}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
              {provider.type}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ 
            width: '10px', 
            height: '10px', 
            borderRadius: '50%', 
            backgroundColor: provider.enabled ? '#10b981' : '#9ca3af',
          }} />
          <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
            {provider.enabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>
      </div>

      <div style={{ marginBottom: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {provider.supportedModels.slice(0, 4).map(model => (
            <span key={model} style={{ 
              fontSize: '0.625rem', 
              padding: '0.125rem 0.5rem', 
              backgroundColor: '#f3f4f6', 
              color: '#4b5563', 
              borderRadius: '9999px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              {model}
            </span>
          ))}
          {provider.supportedModels.length > 4 && (
            <span style={{ fontSize: '0.625rem', color: '#9ca3af' }}>
              +{provider.supportedModels.length - 4} more
          </span>
          )}
        </div>
      </div>

      <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '1rem' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span style={{ fontSize: '0.625rem', fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Priority
          </span>
          <span style={{ fontWeight: 600, color: '#1f2937' }}>{provider.priority}</span>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span style={{ fontSize: '0.625rem', fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Health
          </span>
          <span style={{ fontWeight: 500, color: '#1f2937' }}>{provider.healthStatus || 'Unknown'}</span>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <span style={{ fontSize: '0.625rem', fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Models
          </span>
          <span style={{ fontWeight: 600, color: '#1f2937' }}>{provider.supportedModels.length}</span>
        </div>
      </div>

      {onSelect && (
        <button
          onClick={() => onSelect(provider.id)}
          style={{ marginTop: '1rem', width: '100%', padding: '0.625rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.375rem', fontWeight: 500, cursor: 'pointer' }}
        >
          Select Provider
        </button>
      )}
    </div>
  );
}

export function AIProviderList({ providers, onSelect, className = '' }: { providers: unknown[]; onSelect?: (id: string) => void; className?: string }) {
  return (
    <div className={`v2-ai-provider-list ${className}`} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
      {providers.map(provider => (
        <AIProviderCard key={provider.id} provider={provider} onSelect={onSelect} />
      ))}
    </div>
  );
}

export function AIProviderStatusBadge({ status }: { status: string }) {
  const statusConfig = {
    healthy: { bg: '#dcfce7', color: '#166534', label: 'Healthy' },
    degraded: { bg: '#fef3c7', color: '#92400e', label: 'Degraded' },
    unhealthy: { bg: '#fef2f2', color: '#991b1b', label: 'Unhealthy' },
    unknown: { bg: '#f3f4f6', color: '#4b5563', label: 'Unknown' },
  };

  const config = statusConfig[status] || statusConfig.unknown;

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
      {config.label}
    </span>
  );
}

export function AIProviderHealthIndicator({ providerId }: { providerId: string }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
      <span style={{ 
        width: '8px', 
        height: '8px', 
        borderRadius: '50%', 
        backgroundColor: '#dcfce7',
        animation: 'pulse 2s infinite',
      }} />
      <span style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 500 }}>Healthy</span>
    </div>
  );
}

export function AIProviderTypeBadge({ type }: { type: string }) {
  const typeColors: Record<string, { bg: string; color: string }> = {
    openai: { bg: '#dbeafe', color: '#1d4ed8' },
    anthropic: { bg: '#fef3c7', color: '#92400e' },
    gemini: { bg: '#dcfce7', color: '#166534' },
    huggingface: { bg: '#f3f4f6', color: '#4b5563' },
    nvidia: { bg: '#fef3c7', color: '#92400e' },
    ollama: { bg: '#dcfce7', color: '#166534' },
    vllm: { bg: '#fef3c7', color: '#92400e' },
    openai_compatible: { bg: '#f3f4f6', color: '#4b5563' },
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
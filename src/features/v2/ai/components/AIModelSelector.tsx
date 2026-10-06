import React, { useState, useMemo } from 'react';
import { ModelConfig } from '../services/aiGatewayService';

interface AIModelSelectorProps {
  models: ModelConfig[];
  onSelect?: (model: ModelConfig) => void;
  className?: string;
}

export function AIModelSelector({ models, onSelect, className = '' }: AIModelSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCapability, setSelectedCapability] = useState('all');
  const [selectedModel, setSelectedModel] = useState<ModelConfig | null>(null);

  const capabilities = useMemo(
    () => [...new Set(models.flatMap(m => m.capabilities))].sort(),
    [models]
  );

  const filteredModels = models.filter(model => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      model.displayName.toLowerCase().includes(q) ||
      model.modelId.toLowerCase().includes(q);
    const matchesCapability =
      selectedCapability === 'all' || model.capabilities.includes(selectedCapability);
    return matchesSearch && matchesCapability;
  });

  const handleSelect = (model: ModelConfig) => {
    setSelectedModel(model);
    onSelect?.(model);
  };

  return (
    <div className={`v2-ai-model-selector ${className}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1f2937', margin: 0 }}>
          Model Selector
        </h2>
        <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
          {models.length} model{models.length !== 1 ? 's' : ''} registered
        </span>
      </div>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <input
          type="search"
          aria-label="Search models"
          placeholder="Search models..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            flex: 1,
            minWidth: '220px',
            padding: '0.625rem 0.875rem',
            borderRadius: '0.375rem',
            border: '1px solid #d1d5db',
            fontSize: '0.875rem',
          }}
        />
        <select
          aria-label="Filter by capability"
          value={selectedCapability}
          onChange={(e) => setSelectedCapability(e.target.value)}
          style={{ padding: '0.5rem 1rem', borderRadius: '0.375rem', border: '1px solid #d1d5db', fontSize: '0.875rem' }}
        >
          <option value="all">All Capabilities</option>
          {capabilities.map(cap => (
            <option key={cap} value={cap}>{cap.charAt(0).toUpperCase() + cap.slice(1)}</option>
          ))}
        </select>
      </div>

      {filteredModels.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280', background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.5rem' }}>
          {models.length === 0
            ? 'No models available. Register models in the backend model registry.'
            : 'No models match your filters.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
          {filteredModels.map(model => {
            const selected = selectedModel?.id === model.id;
            return (
              <div
                key={model.id}
                style={{
                  background: 'white',
                  border: selected ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                  borderRadius: '0.75rem',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1f2937', margin: '0 0 0.25rem' }}>
                      {model.displayName}
                    </h3>
                    <code style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#6b7280' }}>
                      {model.modelId}
                    </code>
                  </div>
                  <span
                    style={{
                      padding: '0.125rem 0.5rem',
                      borderRadius: '9999px',
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      backgroundColor: model.healthStatus === 'healthy' ? '#dcfce7' : model.healthStatus === 'degraded' ? '#fef3c7' : model.healthStatus === 'unhealthy' ? '#fef2f2' : '#f3f4f6',
                      color: model.healthStatus === 'healthy' ? '#166534' : model.healthStatus === 'degraded' ? '#92400e' : model.healthStatus === 'unhealthy' ? '#991b1b' : '#6b7280',
                      textTransform: 'uppercase',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {model.healthStatus}
                  </span>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                  {model.capabilities.map(cap => (
                    <span key={cap} style={{ fontSize: '0.65rem', padding: '0.125rem 0.5rem', backgroundColor: '#dbeafe', color: '#1d4ed8', borderRadius: '9999px', textTransform: 'capitalize' }}>
                      {cap}
                    </span>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', fontSize: '0.75rem', color: '#6b7280' }}>
                  <div>
                    <div style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.625rem' }}>Context</div>
                    <div style={{ fontWeight: 600, color: '#1f2937' }}>{model.contextLength.toLocaleString()}</div>
                  </div>
                  <div>
                    <div style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.625rem' }}>Max out</div>
                    <div style={{ fontWeight: 600, color: '#1f2937' }}>{model.maxOutputTokens ? model.maxOutputTokens.toLocaleString() : '—'}</div>
                  </div>
                  <div>
                    <div style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.625rem' }}>Status</div>
                    <div style={{ fontWeight: 600, color: model.status === 'active' ? '#166534' : '#92400e' }}>{model.status}</div>
                  </div>
                </div>

                <button
                  onClick={() => handleSelect(model)}
                  style={{
                    marginTop: 'auto',
                    padding: '0.5rem 1rem',
                    borderRadius: '0.375rem',
                    backgroundColor: selected ? '#3b82f6' : 'white',
                    color: selected ? 'white' : '#3b82f6',
                    border: '1px solid #d1d5db',
                    fontWeight: 500,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                  }}
                >
                  {selected ? 'Selected' : 'Select Model'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

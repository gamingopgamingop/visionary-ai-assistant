import React, { useState, useEffect, useCallback } from 'react';
import { useAIGateway, ProviderConfig, ModelConfig } from '../hooks/useAIGateway';
import { useAIModels } from '../hooks/useAIGateway';
import { LoadingState, EmptyState, ErrorDisplay, Modal } from '../../shared/components';
import { ActionButtonProps } from '../../shared/types';

interface AIModelSelectorProps {
  value?: string;
  onChange: (modelId: string) => void;
  capability?: string;
  providerPriority?: string[];
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function AIModelSelector({
  value,
  onChange,
  capability,
  providerPriority,
  disabled = false,
  placeholder = 'Select a model',
  className = '',
}: AIModelSelectorProps) {
  const { models, loading, error, refetch, getBestModel } = useAIModels();
  const [selectedModel, setSelectedModel] = useState<string | null>(value || null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (value) setSelectedModel(value);
  }, [value]);

  useEffect(() => {
    if (capability) {
      // Fetch models for capability
    }
  }, [capability]);

  const filteredModels = models
    .filter(m => m.status === 'active' && m.healthStatus === 'healthy')
    .filter(m => !searchQuery || m.displayName.toLowerCase().includes(searchQuery.toLowerCase()) || m.modelId.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => b.priority - a.priority);

  const handleSelect = (modelId: string) => {
    setSelectedModel(modelId);
    setShowDropdown(false);
    onChange(modelId);
  };

  if (disabled) {
    return (
      <select value={value || ''} onChange={(e) => onChange(e.target.value)} disabled className={className} style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', backgroundColor: '#f3f4f6', color: '#9ca3af' }}>
        <option value="" disabled>{placeholder}</option>
        {models.map(m => (
          <option key={m.id} value={m.id}>{m.displayName}</option>
        ))}
      </select>
    );
  }

  return (
    <div className={`v2-ai-model-selector ${className}`} style={{ position: 'relative', width: '100%' }}>
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
          <span style={{ color: selectedModel ? '#1f2937' : '#9ca3af' }}>
            {selectedModel 
              ? models.find(m => m.id === selectedModel)?.displayName || selectedModel
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
                placeholder="Search models..."
                onChange={(e) => e.target.value}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                }}
                autoFocus
              />
            </div>
            <div style={{ maxHeight: '250px', overflow: 'auto' }}>
              {models.filter(m => m.status === 'active' && m.healthStatus === 'healthy').map(model => (
                <button
                  key={model.id}
                  onClick={() => handleSelect(model.id)}
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.875rem',
                    textAlign: 'left',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div style={{ padding: '0.5rem', backgroundColor: '#dbeafe', borderRadius: '0.375rem', color: '#1d4ed8' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="3" width="20" height="14" rx="2" />
                      <path d="M8 21h8" />
                      <path d="M12 17v4" />
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, color: '#1f2937', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {model.displayName}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      {model.modelId} · {model.contextLength.toLocaleString()} tokens
                    </div>
                  </div>
                  <span style={{ fontSize: '0.625rem', padding: '0.125rem 0.375rem', backgroundColor: '#dcfce7', color: '#166534', borderRadius: '9999px', fontWeight: 500, textTransform: 'uppercase' }}>
                    {model.capabilities.join(', ')}
                  </span>
                </button>
              ))}
              {models.length === 0 && (
              <div style={{ padding: '1rem', textAlign: 'center', color: '#6b7280' }}>
                No models available
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function AIProviderSelector({
  value,
  onChange,
  enabledOnly = true,
  disabled = false,
  placeholder = 'Select a provider',
  className = '',
}: {
  value?: string;
  onChange: (providerId: string) => void;
  enabledOnly?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const { providers, loading, refetch } = useAIProviders();
  const [selectedProvider, setSelectedProvider] = useState<string | null>(value || null);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (value) setSelectedProvider(value);
  }, [value]);

  const handleSelect = (providerId: string) => {
    setSelectedProvider(providerId);
    onChange(providerId);
  };

  return (
    <div className={`v2-ai-provider-selector ${className}`} style={{ position: 'relative', width: '100%' }}>
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
          {selectedProvider ? providers.find(p => p.id === selectedProvider)?.displayName || selectedProvider : placeholder}
        </span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#9ca3af', flexShrink: 0 }}>
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
            {providers.filter(p => p.enabled).map(provider => (
              <button
                key={provider.id}
                onClick={() => handleSelect(provider.id)}
                style={{ width: '100%', padding: '0.625rem 0.875rem', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div style={{ padding: '0.5rem', backgroundColor: '#dbeafe', borderRadius: '0.375rem', color: '#1d4ed8' }}>
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
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface AIChatPanelProps {
  onSendMessage?: (message: string) => Promise<void>;
  model?: string;
  provider?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  className?: string;
}

export function AIChatPanel({
  onSendMessage,
  model,
  provider,
  systemPrompt,
  temperature = 0.7,
  maxTokens = 1000,
  className = '',
}: AIChatPanelProps) {
  const { chatCompletion, loading: completionLoading, error } = useAIGateway();
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    setLoading(true);
    try {
      const response = await fetch('/v2/ai-gateway-v2/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          model: model || 'auto',
          messages: [
            ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
            ...messages.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: userMessage },
          ],
          temperature,
          maxTokens,
        }),
      });

      const data = await fetch.json();
      if (data.success) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.data.choices[0]?.message?.content || '' }]);
      }
    } catch (err) {
      console.error('Chat error:', err);
    }
  };

  return (
    <div className={`v2-ai-chat-panel ${className}`} style={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '600px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.75rem', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1f2937', margin: 0 }}>
            AI Chat
          </h3>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
            {model && <span style={{ fontSize: '0.7rem', padding: '0.125rem 0.5rem', backgroundColor: '#dbeafe', color: '#1d4ed8', borderRadius: '9999px', fontSize: '0.625rem', fontWeight: 500 }}>{model}</span>}
            {provider && <span style={{ fontSize: '0.7rem', padding: '0.125rem 0.5rem', backgroundColor: '#dbeafe', color: '#1d4ed8', borderRadius: '9999px', fontSize: '0.625rem', fontWeight: 500, marginLeft: '0.25rem' }}>{provider}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <select style={{ padding: '0.25rem 0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.75rem' }}>
            <option value="auto">Auto</option>
            <option value="gpt-4">GPT-4</option>
            <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
            <option value="claude-3-opus">Claude 3 Opus</option>
            <option value="claude-3-sonnet">Claude 3 Sonnet</option>
            <option value="nemotron-3-ultra">Nemotron 3 Ultra</option>
          </select>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {messages.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: '#d1d5db', marginBottom: '1rem' }}>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10" />
              <path d="M15 10h-4" />
              <path d="M15 14h-8" />
            </svg>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1f2937', margin: '0 0 0.5rem' }}>Start a conversation</h3>
            <p style={{ color: '#6b7280', margin: 0, textAlign: 'center', maxWidth: '300px' }}>
              Ask questions, get help with code, or just chat with the AI assistant.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: msg.role === 'user' ? '#dbeafe' : '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: msg.role === 'user' ? '#1d4ed8' : '#166534' }}>
                  {msg.role === 'user' ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="3" width="20" height="14" rx="2" />
                      <path d="M8 21h8" />
                      <path d="M12 17v4" />
                    </svg>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 500, color: '#6b7280', marginBottom: '0.25rem', textTransform: 'capitalize' }}>
                    {msg.role === 'user' ? 'You' : 'Assistant'}
                  </div>
                  <div style={{ color: '#1f2937', whiteSpace: 'pre-wrap', fontSize: '0.875rem', lineHeight: 1.5 }}>
                    {msg.content}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {loading && (
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#166534' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <path d="M8 21h8" />
                <path d="M12 17v4" />
              </svg>
            </div>
            <div style={{ padding: '1rem 1.25rem', backgroundColor: '#f3f4f6', borderRadius: '0.75rem', maxWidth: '70%', animation: 'pulse 1.5s infinite' }}>
              <div style={{ height: '1rem', backgroundColor: '#d1d5db', borderRadius: '0.25rem', width: '60%' }} />
              <div style={{ height: '1rem', backgroundColor: '#d1d5db', borderRadius: '0.25rem', width: '80%', marginTop: '0.5rem' }} />
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e5e7eb', backgroundColor: '#fafafa', borderBottomLeftRadius: '0.75rem', borderBottomRightRadius: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            rows={1}
            style={{
              flex: 1,
              padding: '0.625rem 0.875rem',
              borderRadius: '0.5rem',
              border: '1px solid #d1d5db',
              fontSize: '0.875rem',
              resize: 'none',
              minHeight: '44px',
              maxHeight: '200px',
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(new Event('submit'));
              }
            }}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            style={{
              padding: '0.625rem 1.25rem',
              borderRadius: '0.5rem',
              backgroundColor: input.trim() && !loading ? '#3b82f6' : '#93c5fd',
              color: 'white',
              border: 'none',
              fontWeight: 500,
              cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
              opacity: input.trim() && !loading ? 1 : 0.6,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}

export function AIUsageIndicator({ userId }: { userId: string }) {
  const { usage, summary, loading } = useAIUsage(userId || null);
  
  if (!userId) return null;

  return (
    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
      {Object.entries(summary || {}).map(([resource, value]) => (
        <div key={resource} style={{ padding: '0.75rem 1rem', background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.5rem', minWidth: '120px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {resource.replace(/_/g, ' ')}
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1f2937', marginTop: '0.25rem' }}>
            {value.toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  );
}

export function AIQuotaIndicator({ userId }: { userId: string }) {
  const { quotas, loading } = useAIQuotas(userId);
  
  if (!userId) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {quotas.map(quota => (
        <div key={quota.resourceType} style={{ padding: '1rem', background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontWeight: 500, color: '#374151', textTransform: 'capitalize' }}>
              {quota.resourceType.replace(/_/g, ' ')}
            </span>
            <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              {quota.remaining.toLocaleString()} / {quota.limit.toLocaleString()}
            </span>
          </div>
          <div style={{ height: '6px', backgroundColor: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' }}>
            <div 
              style={{ 
                height: '100%', 
                width: `${Math.min(100, (quota.remaining / quota.limit) * 100)}%`,
                backgroundColor: quota.remaining / quota.limit < 0.2 ? '#ef4444' : quota.remaining / quota.limit < 0.5 ? '#f59e0b' : '#10b981',
                transition: 'width 0.3s ease',
              }} 
            />
          </div>
          <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: '#6b7280', textAlign: 'right' }}>
            Resets: {new Date(quota.resetAt).toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  );
}

export function AIProviderStatus({ providers }: { providers: unknown[] }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
      {providers.map(p => (
        <div key={p.id} style={{ padding: '0.5rem 0.75rem', background: p.enabled ? '#dcfce7' : '#f3f4f6', borderRadius: '0.375rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: p.enabled ? '#10b981' : '#9ca3af' }} />
          <span style={{ fontSize: '0.875rem', fontWeight: 500, color: p.enabled ? '#166534' : '#6b7280' }}>
            {p.displayName}
          </span>
          {p.healthStatus && (
            <span style={{ fontSize: '0.7rem', padding: '0.125rem 0.375rem', borderRadius: '9999px', backgroundColor: p.healthStatus === 'healthy' ? '#dcfce7' : p.healthStatus === 'degraded' ? '#fef3c7' : '#fef2f2', color: p.healthStatus === 'healthy' ? '#166534' : p.healthStatus === 'degraded' ? '#92400e' : '#991b1b', textTransform: 'capitalize' }}>
              {p.healthStatus}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export function AIRequestInspector({ requestId }: { requestId: string }) {
  return (
    <div style={{ padding: '1.5rem', background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.5rem' }}>
      <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1f2937', margin: '0 0 1rem' }}>
        Request Inspector
      </h3>
      <p style={{ color: '#6b7280' }}>Request ID: {requestId}</p>
      <pre style={{ background: '#f3f4f6', padding: '1rem', borderRadius: '0.375rem', overflow: 'auto', fontSize: '0.75rem' }}>
        {JSON.stringify({ requestId, timestamp: new Date().toISOString() }, null, 2)}
      </pre>
    </div>
  );
}

export function AIFallbackStatus({ modelId }: { modelId: string }) {
  return (
    <div style={{ padding: '0.75rem', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#92400e' }}>
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
      <div>
        <div style={{ fontWeight: 500, color: '#92400e' }}>Using Fallback Model</div>
        <div style={{ fontSize: '0.875rem', color: '#78350f' }}>Primary model unavailable, using fallback</div>
      </div>
    </div>
  );
}
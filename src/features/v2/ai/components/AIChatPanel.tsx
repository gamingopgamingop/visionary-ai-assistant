import React, { useState, useEffect, useCallback } from 'react';
import { useAIGateway } from '../hooks/useAIGateway';
import { LoadingState, EmptyState, ErrorDisplay, Modal, Tabs, TabList, Tab, TabPanels, TabPanel } from '../../shared/components';
import { aiGatewayServiceV2, ProviderConfig, ModelConfig, ProviderHealth, ModelHealth, ChatRequest, ChatResponse, ChatMessage, QuotaCheckResult, UsageRecord } from '../services/aiGatewayService';

interface AIModelSelectorProps {
  onSelect?: (model: ModelConfig) => void;
  className?: string;
}

export function AIModelSelector({ onSelect, className = '' }: AIModelSelectorProps) {
  const { models, loading, error, refetch } = useAIGateway();
  const [selectedModel, setSelectedModel] = useState<ModelConfig | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<string>('all');
  const [selectedCapability, setSelectedCapability] = useState<string>('all');

  const filteredModels = models.filter(model => {
    const matchesSearch = model.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         model.modelId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProvider = selectedProvider === 'all' || model.providerId === selectedProvider;
    const matchesCapability = selectedCapability === 'all' || model.capabilities.includes(selectedCapability);
    return matchesSearch && matchesProvider && matchesCapability;
  });

  const capabilities = ['chat', 'completion', 'embeddings', 'images', 'audio', 'video', 'code', 'reasoning'];

  if (loading) return <LoadingState message="Loading models..." />;
  if (error) return <ErrorDisplay error={error} onRetry={refetch} />;

  return (
    <div className={`v2-ai-model-selector ${className}`}>
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1f2937', margin: 0 }}>
            Model Selector
          </h2>
          <button onClick={refetch} disabled={loading} style={{ padding: '0.5rem 1rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}>
            Refresh
          </button>
        </div>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
            <input
              type="search"
              placeholder="Search models..."
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
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}>
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </div>

          <select value={selectedProvider} onChange={(e) => setSelectedProvider(e.target.value)} style={{ padding: '0.5rem 1rem', borderRadius: '0.375rem', border: '1px solid #d1d5db', fontSize: '0.875rem' }}>
            <option value="all">All Providers</option>
            {/* Providers would be loaded from useAIGateway hook */}
          </select>

          <select value={selectedCapability} onChange={(e) => setSelectedCapability(e.target.value)} style={{ padding: '0.5rem 1rem', borderRadius: '0.375rem', border: '1px solid #d1d5db', fontSize: '0.875rem' }}>
            <option value="all">All Capabilities</option>
            {capabilities.map(cap => <option key={cap} value={cap}>{cap.charAt(0).toUpperCase() + cap.slice(1)}</option>)}
          </select>
        </div>
      </div>

      {filteredModels.length === 0 ? (
        <EmptyState 
          title="No models found" 
          description={searchQuery || selectedProvider !== 'all' || selectedCapability !== 'all' 
            ? 'Try adjusting your filters' 
            : 'No models available'}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
          {filteredModels.map(model => (
            <ModelCard key={model.id} model={model} onSelect={onSelect} selected={selectedModel?.id === model.id} />
          ))}
        </div>
      )}
    </div>
  );
}

function ModelCard({ model, onSelect, selected }: { model: unknown; onSelect?: (model: unknown) => void; selected?: boolean }) {
  const capabilityIcons: Record<string, React.ReactNode> = {
    chat: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4"/><path d="M12 17h.01"/></svg>,
    completion: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="4 7 12 15 20 7"/><path d="M14 2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16"/></svg>,
    embeddings: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>,
    images: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
    code: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>,
    reasoning: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 10 10-10-10-10-10 10 10 10"/><path d="M2 17l10 10 10-10"/></svg>,
  };

  const getCapabilityIcon = (cap: string) => capabilityIcons[cap] || <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/></svg>;

  return (
    <div 
      style={{ 
        background: 'white', 
        border: selected ? '2px solid #3b82f6' : '1px solid #e5e7eb', 
        borderRadius: '0.75rem', 
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.2s',
      }}
      onClick={() => onSelect?.(model)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ 
            width: '48px', 
            height: '48px', 
            borderRadius: '0.5rem', 
            backgroundColor: '#dbeafe', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: '#1d4ed8',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 10 10-10-10-10-10 10 10 10"/>
              <path d="M2 17l10 10 10-10"/>
            </svg>
          </div>
          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1f2937', margin: '0 0 0.25rem' }}>
              {model.displayName}
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0, fontFamily: 'monospace' }}>
              {model.modelId}
            </p>
          </div>
        </div>
        {selected && (
          <div style={{ 
            padding: '0.25rem 0.75rem', 
            borderRadius: '9999px', 
            fontSize: '0.7rem', 
            fontWeight: 600,
            backgroundColor: '#dbeafe',
            color: '#1d4ed8',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            Selected
          </div>
        )}
      </div>

      <div style={{ marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
        {model.capabilities.slice(0, 5).map(cap => (
          <span key={cap} style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '0.25rem',
            fontSize: '0.625rem', 
            padding: '0.125rem 0.375rem', 
            backgroundColor: '#f3f4f6', 
            color: '#4b5563', 
            borderRadius: '9999px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            {getCapabilityIcon(cap)}
            <span style={{ textTransform: 'capitalize' }}>{cap}</span>
          </span>
        ))}
        {model.capabilities.length > 5 && (
          <span style={{ fontSize: '0.625rem', color: '#9ca3af' }}>
            +{model.capabilities.length - 5} more
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Context Length</div>
          <div style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1f2937' }}>
            {model.contextLength.toLocaleString()}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Max Output</div>
          <div style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1f2937' }}>
            {model.maxOutputTokens?.toLocaleString() || 'N/A'}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%', 
              backgroundColor: model.status === 'active' ? '#10b981' : model.status === 'deprecated' ? '#f59e0b' : '#ef4444',
            }} />
            <span style={{ fontSize: '0.875rem', fontWeight: 500, textTransform: 'capitalize' }}>
              {model.status}
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '1rem' }}>
        <span style={{ 
          padding: '0.125rem 0.5rem', 
          borderRadius: '9999px', 
          fontSize: '0.625rem', 
          fontWeight: 600,
          backgroundColor: '#dbeafe',
          color: '#1d4ed8',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          {model.providerId}
        </span>
        {model.healthStatus && (
          <span style={{ 
            padding: '0.125rem 0.5rem', 
            borderRadius: '9999px', 
            fontSize: '0.625rem', 
            fontWeight: 600,
            backgroundColor: model.healthStatus === 'healthy' ? '#dcfce7' : model.healthStatus === 'degraded' ? '#fef3c7' : '#fef2f2',
            color: model.healthStatus === 'healthy' ? '#166534' : model.healthStatus === 'degraded' ? '#92400e' : '#991b1b',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            {model.healthStatus}
          </span>
        )}
      </div>

      <button
        onClick={() => onSelect?.(model)}
        style={{
          width: '100%',
          padding: '0.625rem 1rem',
          borderRadius: '0.375rem',
          backgroundColor: selected ? '#3b82f6' : 'white',
          color: selected ? 'white' : '#3b82f6',
          border: '1px solid #d1d5db',
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'all 0.15s',
        }}
      >
        {selected ? 'Selected' : 'Select Model'}
      </button>
    </div>
  );
}

export function AIProviderSelector({ onSelect, className = '' }: { onSelect?: (provider: unknown) => void; className?: string }) {
  const { providers, loading, error, refetch } = useAIGateway();

  if (loading) return <LoadingState message="Loading providers..." />;
  if (error) return <ErrorDisplay error={error} onRetry={refetch} />;

  return (
    <div className={`v2-ai-provider-selector ${className}`}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1f2937', margin: '0 0 1rem' }}>
        AI Providers
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
        {providers.map(provider => (
          <ProviderCard key={provider.id} provider={provider} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}

function ProviderCard({ provider, onSelect }: { provider: unknown; onSelect?: (provider: unknown) => void }) {
  const statusColors = {
    healthy: { bg: '#dcfce7', color: '#166534', border: '#bbf7d0' },
    degraded: { bg: '#fef3c7', color: '#92400e', border: '#fde68a' },
    unhealthy: { bg: '#fef2f2', color: '#991b1b', border: '#fecaca' },
    unknown: { bg: '#f3f4f6', color: '#6b7280', border: '#e5e7eb' },
  };

  const health = provider.healthStatus || 'unknown';
  const colors = statusColors[health as keyof typeof statusColors] || statusColors.unknown;

  return (
    <div 
      style={{ 
        background: 'white', 
        border: `1px solid ${colors.border}`, 
        borderRadius: '0.75rem', 
        padding: '1.5rem',
        cursor: onSelect ? 'pointer' : 'default',
        transition: 'all 0.2s',
      }}
      onClick={() => onSelect?.(provider)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ 
            width: '48px', 
            height: '48px', 
            borderRadius: '0.5rem', 
            backgroundColor: '#dbeafe', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: '#1d4ed8',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <path d="M8 21h8" />
              <path d="M12 17v4" />
            </svg>
          </div>
          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1f2937', margin: '0 0 0.25rem' }}>
              {provider.displayName}
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
              {provider.type}
            </p>
          </div>
        </div>
        <span style={{ 
          padding: '0.25rem 0.75rem', 
          borderRadius: '9999px', 
          fontSize: '0.7rem', 
          fontWeight: 600,
          backgroundColor: colors.bg,
          color: colors.color,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          {provider.enabled ? 'Enabled' : 'Disabled'}
        </span>
      </div>

      <div style={{ marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
        <span style={{ 
          fontSize: '0.625rem', 
          padding: '0.125rem 0.375rem', 
          backgroundColor: '#f3f4f6', 
          color: '#4b5563', 
          borderRadius: '9999px',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          {provider.type}
        </span>
        <span style={{ 
          fontSize: '0.625rem', 
          padding: '0.125rem 0.375rem', 
          backgroundColor: colors.bg,
          color: colors.color,
          borderRadius: '9999px',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          {health}
        </span>
        {provider.priority && (
          <span style={{ 
            fontSize: '0.625rem', 
            padding: '0.125rem 0.375rem', 
            backgroundColor: '#fef3c7',
            color: '#92400e',
            borderRadius: '9999px',
          }}>
            Priority: {provider.priority}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ 
            width: '8px', 
            height: '8px', 
            borderRadius: '50%', 
            backgroundColor: health === 'healthy' ? '#10b981' : health === 'degraded' ? '#f59e0b' : health === 'unhealthy' ? '#ef4444' : '#9ca3af',
          }} />
          <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Health: {health.charAt(0).toUpperCase() + health.slice(1)}</span>
        </div>
        {onSelect && (
          <button 
            onClick={(e) => { e.stopPropagation(); onSelect(provider); }}
            style={{ padding: '0.5rem 1rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.375rem', fontWeight: 500, cursor: 'pointer' }}
          >
            Select
          </button>
        )}
      </div>
    </div>
  );
}

export function AIChatPanel({ className = '' }: { className?: string }) {
  const { chatCompletion, loading, error } = useAIGateway();
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [streaming, setStreaming] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || !selectedModel) return;
    
    const userMessage = { role: 'user' as const, content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setStreaming(true);

    try {
      // Use streaming if available
      const stream = await aiGatewayServiceV2.chatCompletionStream({
        model: selectedModel,
        messages: [...messages, userMessage],
        stream: true,
      });

      if (stream) {
        setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
        const reader = stream.getReader();
        const decoder = new TextDecoder();
        let accumulated = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          accumulated += chunk;
          
          // Parse SSE format
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = {
                      ...newMessages[newMessages.length - 1],
                      content: newMessages[newMessages.length - 1].content + content
                    };
                    return newMessages;
                  });
                }
              } catch (e) {
                // Ignore parse errors
              }
            }
          }
        }
      } else {
        // Non-streaming fallback
        const response = await aiGatewayServiceV2.chatCompletion({
          model: selectedModel,
          messages: [...messages, userMessage],
        });
        if (response.success && response.data) {
          const reply = response.data.choices[0]?.message?.content;
          setMessages(prev => [...prev, { role: 'assistant', content: typeof reply === 'string' ? reply : '' }]);
        }
      }
    } catch (err) {
      console.error('Chat error:', err);
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div className={`v2-ai-chat-panel ${className}`} style={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '600px', background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.75rem', overflow: 'hidden' }}>
      <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1f2937', margin: 0 }}>
          AI Chat
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} style={{ padding: '0.375rem 0.75rem', borderRadius: '0.375rem', border: '1px solid #d1d5db', fontSize: '0.875rem' }}>
            <option value="">Select a model...</option>
            {/* Models would come from useAIGateway hook */}
          </select>
          {streaming && <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: '#3b82f6' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin"><circle cx="12" cy="12" r="10" strokeOpacity="0.25" /><path d="M12 2a10 10 0 0 1 10 10" /></svg>
            Streaming...
          </span>}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#9ca3af', padding: '2rem' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto 1rem', color: '#d1d5db' }}>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4"/>
              <path d="M12 17h.01"/>
            </svg>
            <p style={{ fontSize: '1.125rem', fontWeight: 500, color: '#6b7280', margin: '0 0 0.5rem' }}>
              Start a conversation
            </p>
            <p style={{ fontSize: '0.875rem', color: '#9ca3af', margin: 0 }}>
              Select a model and send a message to begin
            </p>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div key={index} style={{ display: 'flex', gap: '0.75rem', maxWidth: '80%', alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{ 
                width: '32px', 
                height: '32px', 
                borderRadius: '50%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                backgroundColor: msg.role === 'user' ? '#3b82f6' : '#f3f4f6',
                color: msg.role === 'user' ? 'white' : '#374151',
              }}>
                {msg.role === 'user' ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/></svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>
                )}
              </div>
              <div style={{ 
                maxWidth: '100%', 
                padding: '0.75rem 1rem', 
                borderRadius: '0.75rem',
                backgroundColor: msg.role === 'user' ? '#3b82f6' : '#f3f4f6',
                color: msg.role === 'user' ? 'white' : '#1f2937',
              }}>
                <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{msg.content}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '0.75rem' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
          placeholder="Type a message..."
          disabled={loading || streaming || !selectedModel}
          style={{ flex: 1, padding: '0.625rem 1rem', borderRadius: '0.5rem', border: '1px solid #d1d5db', fontSize: '0.875rem' }}
        />
        <button onClick={handleSend} disabled={loading || streaming || !input.trim() || !selectedModel} style={{ padding: '0.625rem 1.25rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 500, cursor: 'pointer', opacity: (loading || streaming || !input.trim() || !selectedModel) ? 0.5 : 1 }}>
          Send
        </button>
      </div>
    </div>
  );
}
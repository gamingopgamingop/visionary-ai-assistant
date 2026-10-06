import React from 'react';
import { ActionButtonProps } from '../types';

interface ErrorDisplayProps {
  error: Error | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  showDetails?: boolean;
  title?: string;
}

export function ErrorDisplay({
  error,
  onRetry,
  onDismiss,
  showDetails = false,
  title = 'Something went wrong',
}: ErrorDisplayProps) {
  if (!error) return null;

  const isRetryable = error.message.includes('network') || 
                     error.message.includes('timeout') ||
                     error.message.includes('429') ||
                     error.message.includes('503') ||
                     error.message.includes('502') ||
                     error.message.includes('504');

  return (
    <div 
      className="v2-error-display" 
      role="alert"
      style={{
        padding: '1.5rem',
        borderRadius: '0.5rem',
        backgroundColor: '#fef2f2',
        border: '1px solid #fecaca',
        color: '#991b1b',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.125rem', fontWeight: 600 }}>
            {title}
          </h3>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#7f1d1d' }}>
            {error.message || 'An unexpected error occurred'}
          </p>
          
          {showDetails && error.stack && (
            <details style={{ marginTop: '1rem' }}>
              <summary style={{ cursor: 'pointer', fontSize: '0.875rem', color: '#7f1d1d' }}>
                Show technical details
              </summary>
              <pre style={{ 
                marginTop: '0.5rem', 
                padding: '0.75rem', 
                backgroundColor: '#fee2e2', 
                borderRadius: '0.25rem',
                fontSize: '0.75rem',
                overflow: 'auto',
                maxHeight: '200px',
              }}>
                {error.stack}
              </pre>
            </details>
          )}
        </div>
        
        {onDismiss && (
          <button
            onClick={onDismiss}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0.25rem',
              color: '#991b1b',
              fontSize: '1.25rem',
              lineHeight: 1,
            }}
            aria-label="Dismiss error"
          >
            ×
          </button>
        )}
      </div>

      {(isRetryable || onRetry) && (
        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
          {onRetry && (
            <button
              onClick={onRetry}
              className="v2-btn v2-btn-primary"
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                backgroundColor: '#dc2626',
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 500,
                fontSize: '0.875rem',
              }}
            >
              Try Again
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function InlineError({ message, onDismiss }: { message: string; onDismiss?: () => void }) {
  return (
    <div 
      className="v2-inline-error"
      role="alert"
      style={{
        padding: '0.75rem 1rem',
        borderRadius: '0.375rem',
        backgroundColor: '#fef2f2',
        border: '1px solid #fecaca',
        color: '#991b1b',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '0.875rem',
      }}
    >
      <span>{message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0.25rem',
            color: '#991b1b',
            fontSize: '1.25rem',
            lineHeight: 1,
          }}
          aria-label="Dismiss"
        >
          ×
        </button>
      )}
    </div>
  );
}
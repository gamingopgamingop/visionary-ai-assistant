import React, { useState, useCallback } from 'react';

interface RetryButtonProps {
  onRetry: () => Promise<void> | void;
  children?: React.ReactNode;
  disabled?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  onExhausted?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  'aria-label'?: string;
}

export function RetryButton({
  onRetry,
  children = 'Retry',
  disabled = false,
  maxRetries = 3,
  retryDelay = 1000,
  onExhausted,
  variant = 'primary',
  size = 'md',
  className = '',
  'aria-label': ariaLabel,
}: RetryButtonProps) {
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  const handleClick = useCallback(async () => {
    if (disabled || isRetrying) return;
    
    setIsRetrying(true);
    setRetryCount(c => c + 1);

    try {
      await onRetry();
    } catch (error) {
      console.error('Retry failed:', error);
      
      if (retryCount + 1 >= maxRetries) {
        onExhausted?.();
      }
    } finally {
      setIsRetrying(false);
    }
  }, [onRetry, disabled, maxRetries, onExhausted, retryCount]);

  const isExhausted = retryCount >= maxRetries;

  const baseStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    borderRadius: '0.375rem',
    fontWeight: 500,
    cursor: (disabled || isRetrying || isExhausted) ? 'not-allowed' : 'pointer',
    transition: 'all 0.15s ease',
    padding: size === 'sm' ? '0.375rem 0.75rem' : size === 'lg' ? '0.75rem 1.5rem' : '0.5rem 1rem',
    fontSize: size === 'sm' ? '0.8125rem' : size === 'lg' ? '1rem' : '0.875rem',
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      backgroundColor: '#3b82f6',
      color: 'white',
      border: 'none',
    },
    secondary: {
      backgroundColor: 'white',
      color: '#374151',
      border: '1px solid #d1d5db',
    },
    danger: {
      backgroundColor: '#ef4444',
      color: 'white',
      border: 'none',
    },
    ghost: {
      backgroundColor: 'transparent',
      color: '#3b82f6',
      border: 'none',
    },
  };

  const style = {
    ...baseStyles,
    ...variantStyles[variant],
    opacity: (disabled || isRetrying || isExhausted) ? 0.5 : 1,
    borderRadius: '0.375rem',
    border: 'none',
    fontWeight: 500,
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled || isRetrying || isExhausted}
      style={style}
      className={className}
      aria-label={ariaLabel}
      aria-busy={isRetrying}
    >
      {isRetrying && (
        <svg 
          className="animate-spin" 
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
          style={{ width: '1em', height: '1em' }}
        >
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="30 70" strokeLinecap="round">
            <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite" />
          </circle>
        </svg>
      )}
      <span>{isRetrying ? 'Retrying...' : isExhausted ? 'Max retries reached' : children}</span>
      {retryCount > 0 && !isExhausted && (
        <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>
          ({retryCount}/{maxRetries})
        </span>
      )}
    </button>
  );
}

export function RetryWithBackoff({
  onRetry,
  children = 'Retry',
  maxRetries = 3,
  baseDelay = 1000,
  maxDelay = 30000,
  backoffMultiplier = 2,
  ...props
}: RetryButtonProps & { 
  baseDelay?: number; 
  maxDelay?: number; 
  backoffMultiplier?: number;
}) {
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [nextRetryAt, setNextRetryAt] = useState<number | null>(null);

  const handleClick = useCallback(async () => {
    if (props.disabled || isRetrying) return;
    
    setIsRetrying(true);
    setRetryCount(c => c + 1);

    try {
      await onRetry();
    } catch (error) {
      console.error('Retry failed:', error);
      
      if (retryCount + 1 < maxRetries) {
        const delay = Math.min(
          baseDelay * Math.pow(backoffMultiplier, retryCount),
          maxDelay
        );
        
        const nextRetry = Date.now() + delay;
        setNextRetryAt(nextRetry);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Recursive retry
        if (!props.disabled) {
          handleClick();
        }
      } else {
        props.onExhausted?.();
      }
    } finally {
      setIsRetrying(false);
      setNextRetryAt(null);
    }
  }, [onRetry, maxRetries, baseDelay, maxDelay, backoffMultiplier, retryCount, props.disabled]);

  const isExhausted = retryCount >= maxRetries;

  return (
    <RetryButton
      onRetry={handleClick}
      disabled={props.disabled || isExhausted}
      maxRetries={maxRetries}
      {...props}
    >
      {children}
      {nextRetryAt && (
        <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>
          Next retry in {Math.ceil((nextRetryAt - Date.now()) / 1000)}s
        </span>
      )}
    </RetryButton>
  );
}
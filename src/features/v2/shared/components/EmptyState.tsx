import React from 'react';
import { ActionButtonProps } from '../../types';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: ActionButtonProps;
  secondaryAction?: ActionButtonProps;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div 
      className={`v2-empty-state ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 1.5rem',
        textAlign: 'center',
        backgroundColor: '#fafafa',
        borderRadius: '0.5rem',
        border: '1px dashed #d1d5db',
        minHeight: '200px',
      }}
    >
      {icon && (
        <div 
          style={{ 
            marginBottom: '1rem', 
            color: '#9ca3af',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </div>
      )}
      
      <h3 style={{ 
        margin: '0 0 0.5rem', 
        fontSize: '1.125rem', 
        fontWeight: 600, 
        color: '#1f2937' 
      }}>
        {title}
      </h3>
      
      {description && (
        <p style={{ 
          margin: '0 0 1.5rem', 
          fontSize: '0.875rem', 
          color: '#6b7280',
          maxWidth: '400px',
        }}>
          {description}
        </p>
      )}
      
      {(action || secondaryAction) && (
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              disabled={secondaryAction.disabled}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                backgroundColor: 'white',
                color: '#374151',
                border: '1px solid #d1d5db',
                cursor: secondaryAction.disabled ? 'not-allowed' : 'pointer',
                fontWeight: 500,
                fontSize: '0.875rem',
                opacity: secondaryAction.disabled ? 0.5 : 1,
              }}
              aria-label={secondaryAction['aria-label']}
            >
              {secondaryAction.children}
            </button>
          )}
          {action && (
            <button
              onClick={action.onClick}
              disabled={action.disabled}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                cursor: action.disabled ? 'not-allowed' : 'pointer',
                fontWeight: 500,
                fontSize: '0.875rem',
                opacity: action.disabled ? 0.5 : 1,
              }}
              aria-label={action['aria-label']}
            >
              {action.children}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function EmptyTableState({ 
  title = 'No data', 
  description, 
  action,
  icon 
}: { 
  title?: string; 
  description?: string; 
  action?: { label: string; onClick: () => void };
  icon?: React.ReactNode;
}) {
  return (
    <div style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
      <EmptyState
        icon={icon}
        title={title}
        description={description}
        action={action ? { ...action, onClick: action.onClick, children: action.label } : undefined}
      />
    </div>
  );
}

export function NoResultsState({ 
  searchTerm, 
  onClearSearch 
}: { 
  searchTerm?: string; 
  onClearSearch?: () => void;
}) {
  return (
    <div style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
      <EmptyState
        title={searchTerm ? `No results for "${searchTerm}"` : 'No results found'}
        description={searchTerm ? 'Try adjusting your search or filters' : 'No data matches your criteria'}
        action={onClearSearch ? {
          label: 'Clear search',
          onClick: onClearSearch,
          children: 'Clear search',
        } : undefined}
        icon={
          <svg 
            width="64" 
            height="64" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="1.5"
            style={{ color: '#9ca3af' }}
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
        }
      />
    </div>
  );
}
import React from 'react';

interface PermissionBadgeProps {
  permission: { 
    id: string;
    name: string; 
    description?: string; 
    resource: string; 
    action: string; 
  };
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outline' | 'filled';
  showResource?: boolean;
  showAction?: boolean;
  className?: string;
  onClick?: () => void;
}

export function PermissionBadge({ 
  permission, 
  size = 'md', 
  variant = 'default', 
  showResource = true, 
  showAction = true,
  className = '',
  onClick,
}: PermissionBadgeProps) {
  const sizeStyles = {
    sm: { padding: '0.125rem 0.5rem', fontSize: '0.625rem', gap: '0.25rem' },
    md: { padding: '0.25rem 0.75rem', fontSize: '0.75rem', gap: '0.375rem' },
    lg: { padding: '0.375rem 1rem', fontSize: '0.875rem', gap: '0.5rem' },
  };

  const variantStyles = {
    default: { backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb' },
    outline: { backgroundColor: 'transparent', color: '#374151', border: '1px solid #d1d5db' },
    filled: { backgroundColor: '#3b82f6', color: 'white', border: 'none' },
  };

  const actionIcons: Record<string, React.ReactNode> = {
    read: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
    write: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5"/></svg>,
    create: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    update: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>,
    delete: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
    manage: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 1 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 1 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
    send: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
    invoke: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
    execute: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>,
  };

  const getActionIcon = (action: string) => {
    return actionIcons[action] || (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
      </svg>
    );
  };

  const sizeStyles = {
    sm: { padding: '0.125rem 0.5rem', fontSize: '0.625rem', gap: '0.25rem' },
    md: { padding: '0.25rem 0.75rem', fontSize: '0.75rem', gap: '0.375rem' },
    lg: { padding: '0.375rem 1rem', fontSize: '0.875rem', gap: '0.5rem' },
  };

  const variantStyles = {
    default: { backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb' },
    outline: { backgroundColor: 'transparent', color: '#374151', border: '1px solid #d1d5db' },
    filled: { backgroundColor: '#3b82f6', color: 'white', border: 'none' },
  };

  const sizeStyle = sizeStyles[size];
  const variantStyle = variantStyles[variant];

  const content = (
    <span 
      style={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: '0.375rem',
        padding: sizeStyles[size].padding,
        fontSize: sizeStyles[size].fontSize,
        fontWeight: 500,
        borderRadius: '9999px',
        backgroundColor: variantStyle.backgroundColor,
        color: variantStyle.color,
        border: variantStyle.border,
        cursor: onClick ? 'pointer' : 'default',
        ...(onClick && { userSelect: 'none' })
      }}
      onClick={onClick}
      title={permission.description}
    >
      {showResource && (
        <span style={{ opacity: variant === 'filled' ? 0.9 : 0.7 }}>
          {permission.resource.split('.').pop() || permission.resource}
        </span>
      )}
      {(showResource && showAction) && <span style={{ opacity: 0.5 }}>:</span>}
      {showAction && (
        <>
          {actionIcons[permission.action] || (
            <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>
              {permission.action.charAt(0).toUpperCase()}
            </span>
          )}
        </>
      )}
    </span>;

  if (onClick) {
    return (
      <button
        onClick={onClick}
        style={{
          ...sizeStyles[size],
          ...variantStyle,
          borderRadius: '9999px',
          fontWeight: 500,
          fontSize: sizeStyles[size].fontSize,
          cursor: 'pointer',
          background: 'none',
          border: 'none',
          padding: 0,
        }}
        className={className}
      >
        {content}
      </button>
    );
  }

  return <span style={sizeStyles[size]} className={className}>{content}</span>;
}

export function PermissionBadgeGroup({ 
  permissions, 
  size = 'md', 
  variant = 'default',
  maxVisible = 4,
  className = '',
}: {
  permissions: Array<{ id: string; name: string; resource: string; action: string }>;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outline' | 'filled';
  maxVisible?: number;
  className?: string;
}) {
  const visible = permissions.slice(0, maxVisible);
  const remaining = permissions.length - maxVisible;

  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {visible.map(perm => (
        <PermissionBadge key={perm.id} permission={perm} size={size} variant={variant} />
      ))}
      {remaining > 0 && (
        <span 
          style={{ 
            ...sizeStyles[size],
            ...variantStyles[variant],
            borderRadius: '9999px',
          }}
        >
          +{remaining}
        </span>
      )}
    </div>
  );
}
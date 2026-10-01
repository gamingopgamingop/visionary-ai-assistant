import React from 'react';

interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
  overlay?: boolean;
}

export function LoadingState({
  message = 'Loading...',
  size = 'md',
  fullScreen = false,
  overlay = false,
}: LoadingStateProps) {
  const spinnerSize = {
    sm: 16,
    md: 24,
    lg: 32,
  }[size];

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.75rem',
    padding: fullScreen ? '3rem' : '1.5rem',
    ...(fullScreen && {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: overlay ? 'rgba(255, 255, 255, 0.9)' : 'white',
      zIndex: 50,
    }),
  };

  const spinnerStyle: React.CSSProperties = {
    width: spinnerSize,
    height: spinnerSize,
    border: `2px solid #e5e7eb`,
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  };

  return (
    <div style={containerStyle}>
      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div style={spinnerStyle} role="status" aria-label={message} />
      {message && <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>{message}</p>}
    </div>
  );
}

export function InlineLoading({ size = 'sm', color = '#3b82f6' }: { size?: 'sm' | 'md' | 'lg'; color?: string }) {
  const spinnerSize = {
    sm: 14,
    md: 20,
    lg: 28,
  }[size];

  return (
    <div
      style={{
        width: spinnerSize,
        height: spinnerSize,
        border: `2px solid #e5e7eb`,
        borderTopColor: color,
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
      }}
      role="status"
      aria-label="Loading"
    />
  );
}

export function SkeletonLoader({
  width = '100%',
  height = '1rem',
  borderRadius = '0.375rem',
  animated = true,
}: {
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  animated?: boolean;
}) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius,
        background: animated 
          ? 'linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%)'
          : '#e5e7eb',
        backgroundSize: animated ? '200% 100%' : 'auto',
        animation: animated ? 'shimmer 1.5s infinite' : 'none',
      }}
    >
      <style jsx>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}

export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ padding: '1.5rem', background: 'white', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}>
          <SkeletonLoader width="40%" height="1.25rem" marginBottom="1rem" />
          <SkeletonLoader width="60%" height="1rem" marginBottom="0.5rem" />
          <SkeletonLoader width="80%" height="1rem" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div style={{ background: 'white', borderRadius: '0.5rem', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
      <div style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb', display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: '1rem' }}>
        {Array.from({ length: columns }).map((_, i) => (
          <SkeletonLoader key={i} width="60%" height="1rem" />
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: '1rem', padding: '1rem', borderBottom: rowIndex < rows - 1 ? '1px solid #e5e7eb' : 'none' }}>
            {Array.from({ length: columns }).map((_, colIndex) => (
              <SkeletonLoader key={`${rowIndex}-${colIndex}`} width="80%" height="1rem" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

/**
 * V2Layout — navigation shell for all /v2/* pages.
 * Responsive: horizontal scrollable nav on desktop, wraps on mobile.
 */
export function V2Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const currentPath = location.pathname.replace(/\/+$/, '') || '/v2';

  const navItems = [
    { to: '/v2', label: 'Dashboard', exact: true },
    { to: '/v2/auth', label: 'Auth' },
    { to: '/v2/connectors', label: 'Connectors' },
    { to: '/v2/ai', label: 'AI' },
    { to: '/v2/api-keys', label: 'API Keys' },
    { to: '/v2/security', label: 'Security' },
    { to: '/v2/audit', label: 'Audit' },
    { to: '/v2/usage', label: 'Usage' },
    { to: '/v2/providers', label: 'Providers' },
    { to: '/v2/jobs', label: 'Jobs' },
    { to: '/v2/admin', label: 'Admin' },
    { to: '/v2/settings', label: 'Settings' },
  ];

  const isActive = (to: string, exact?: boolean) =>
    exact ? currentPath === to : currentPath.startsWith(to);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      <nav
        aria-label="V2 navigation"
        style={{
          backgroundColor: 'white',
          borderBottom: '1px solid #e5e7eb',
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}
      >
        <div style={{ maxWidth: '1300px', margin: '0 auto', padding: '0 1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', height: '56px', gap: '0.5rem' }}>
            <Link
              to="/v2"
              style={{
                fontWeight: 700,
                fontSize: '1rem',
                color: '#1f2937',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  padding: '0.125rem 0.5rem',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  borderRadius: '0.375rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                }}
              >
                V2
              </span>
            </Link>
            <div
              style={{
                display: 'flex',
                gap: '0.125rem',
                overflowX: 'auto',
                flex: 1,
                scrollbarWidth: 'none',
              }}
              role="navigation"
            >
              {navItems.map(item => {
                const active = isActive(item.to, item.exact);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    aria-current={active ? 'page' : undefined}
                    style={{
                      padding: '0.375rem 0.75rem',
                      borderRadius: '0.375rem',
                      fontSize: '0.8125rem',
                      fontWeight: active ? 600 : 500,
                      color: active ? '#1d4ed8' : '#6b7280',
                      backgroundColor: active ? '#dbeafe' : 'transparent',
                      textDecoration: 'none',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
            <Link
              to="/"
              style={{
                fontSize: '0.8125rem',
                color: '#6b7280',
                textDecoration: 'none',
                flexShrink: 0,
                padding: '0.375rem 0.75rem',
              }}
            >
              ← Main App
            </Link>
          </div>
        </div>
      </nav>
      <main style={{ maxWidth: '1300px', margin: '0 auto', padding: '2rem 1rem' }}>{children}</main>
    </div>
  );
}

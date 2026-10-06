import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { V2Dashboard } from '../dashboard/components/V2Dashboard';
import { AuthV2Page } from '../auth/components/AuthPanel';
import { LoginPage } from '../auth/components/LoginForm';
import { SignupPage } from '../auth/components/SignupForm';
import { PasswordResetForm } from '../auth/components/PasswordResetForm';
import { ConnectorsPage } from '../connectors/components/ConnectorDashboard';
import { ApiKeyDashboard } from '../api-keys/components/ApiKeyDashboard';
import { SecurityCenter } from '../security/components/SecurityCenter';
import { AuditDashboard } from '../audit/components/AuditDashboard';
import { UsageDashboard } from '../usage/components/UsageDashboard';
import { AdminDashboard } from '../admin/components/AdminDashboard';
import { ProviderDashboard } from '../providers/components/ProviderDashboard';
import { JobDashboard } from '../jobs/components/JobDashboard';
import { RoleManager } from '../rbac/components/RoleManager';
import { AIModelSelector, AIProviderSelector, AIChatPanel } from '../ai/components/AIChatPanel';
import { V2ErrorBoundary } from '../shared/components/ErrorBoundary';
import { V2Layout } from './V2Layout';
import { authServiceV2 } from '../auth/services/authService';

/**
 * Standalone V2 Router module.
 *
 * INTEGRATION POINT (documented per architecture-v2 plan):
 * The existing app router (src/App.tsx) can mount this module additively
 * with a single nested route — no existing route is changed or replaced:
 *
 *   import V2Router from './features/v2/routing/V2Router';
 *   ...
 *   <Route path="/v2/*" element={<V2Router />} />
 *
 * Every /v2/* path is namespaced under this module so the existing
 * routes (/, /workspace, /pricing, …) remain untouched.
 */
export function V2Router() {
  return (
    <V2ErrorBoundary>
      <V2Layout>
        <Routes>
          <Route index element={<V2Dashboard />} />
          <Route path="auth" element={<AuthV2Page />} />
          <Route path="auth/login" element={<LoginPage />} />
          <Route path="auth/signup" element={<SignupPage />} />
          <Route
            path="auth/password-reset"
            element={
              <AuthPageShell title="Reset Password">
                <PasswordResetForm />
              </AuthPageShell>
            }
          />
          <Route path="connectors" element={<ConnectorsPage />} />
          <Route path="connectors/:id" element={<ConnectorsPage />} />
          <Route path="ai" element={<AIPage />} />
          <Route path="api-keys" element={<PageShell title="API Keys"><ApiKeyDashboard /></PageShell>} />
          <Route path="security" element={<PageShell title="Security"><SecurityCenter /></PageShell>} />
          <Route path="audit" element={<PageShell title="Audit Logs"><AuditDashboard /></PageShell>} />
          <Route path="usage" element={<PageShell title="Usage & Quotas"><UsageDashboard /></PageShell>} />
          <Route path="providers" element={<PageShell title="AI Providers"><ProviderDashboard /></PageShell>} />
          <Route path="jobs" element={<PageShell title="Background Jobs"><JobDashboard /></PageShell>} />
          <Route path="admin" element={<PageShell title="Admin"><AdminDashboard /></PageShell>} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/v2" replace />} />
        </Routes>
      </V2Layout>
    </V2ErrorBoundary>
  );
}

function PageShell({ title, children }: { title: string; children: React.ReactNode }) {
  return <div style={{ padding: '0.5rem 0' }}>{children}</div>;
}

function AuthPageShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '2.5rem', width: '100%', maxWidth: '440px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1f2937', margin: '0 0 1.5rem' }}>{title}</h1>
        <div style={{ textAlign: 'left' }}>{children}</div>
      </div>
    </div>
  );
}

function AIPage() {
  const [activeTab, setActiveTab] = useState<'chat' | 'models' | 'providers'>('chat');

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0.5rem 0' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#1f2937', margin: '0 0 0.5rem' }}>
          AI Gateway
        </h1>
        <p style={{ color: '#6b7280', margin: 0 }}>
          Multi-provider routing with health checks and fallback
        </p>
      </div>

      <div role="tablist" aria-label="AI sections" style={{ display: 'flex', gap: '0.25rem', borderBottom: '2px solid #e5e7eb', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {(['chat', 'models', 'providers'] as const).map(tab => (
          <button
            key={tab}
            role="tab"
            aria-selected={activeTab === tab}
            aria-controls={`ai-panel-${tab}`}
            id={`ai-tab-${tab}`}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '0.75rem 1.25rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid #3b82f6' : '2px solid transparent',
              marginBottom: '-2px',
              fontWeight: activeTab === tab ? 600 : 500,
              fontSize: '0.875rem',
              color: activeTab === tab ? '#1d4ed8' : '#6b7280',
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`ai-panel-${activeTab}`} aria-labelledby={`ai-tab-${activeTab}`}>
        {activeTab === 'chat' && <AIChatPanel />}
        {activeTab === 'models' && <AIModelSelector />}
        {activeTab === 'providers' && <AIProviderSelector />}
      </div>
    </div>
  );
}

function SettingsPage() {
  const [featureFlags, setFeatureFlags] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    authServiceV2
      .getAuthStatus()
      .then(response => {
        if (response.success && response.data?.featureFlags) {
          setFeatureFlags(response.data.featureFlags);
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '0.5rem 0' }}>
      <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#1f2937', margin: '0 0 0.5rem' }}>
        V2 Settings
      </h1>
      <p style={{ color: '#6b7280', margin: '0 0 2rem' }}>
        Feature flags are controlled by backend environment configuration.
      </p>
      <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.75rem', padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1f2937', margin: '0 0 1rem' }}>
          Feature Flags (read-only)
        </h2>
        {!loaded ? (
          <p style={{ color: '#9ca3af' }}>Loading…</p>
        ) : Object.keys(featureFlags).length === 0 ? (
          <p style={{ color: '#9ca3af', fontStyle: 'italic' }}>
            Feature flags are not reported by the backend. All V2 subsystems default to disabled.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {Object.entries(featureFlags).map(([flag, enabled]) => (
              <div
                key={flag}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.625rem 1rem', backgroundColor: '#f9fafb', borderRadius: '0.375rem' }}
              >
                <code style={{ fontFamily: 'monospace', fontSize: '0.8125rem', color: '#374151' }}>{flag}</code>
                <span
                  style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    backgroundColor: enabled ? '#dcfce7' : '#f3f4f6',
                    color: enabled ? '#166534' : '#6b7280',
                  }}
                >
                  {enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            ))}
          </div>
        )}
        <p style={{ marginTop: '1rem', fontSize: '0.8125rem', color: '#6b7280' }}>
          To enable a subsystem, set its environment variable (e.g.{' '}
          <code style={{ fontFamily: 'monospace' }}>NEW_CONNECTOR_ENGINE_ENABLED=true</code>) in the
          Supabase Edge Function configuration. See{' '}
          <code style={{ fontFamily: 'monospace' }}>docs/architecture-v2.md</code>.
        </p>
      </div>
    </div>
  );
}

export default V2Router;

import React, { useEffect, useState, useCallback } from 'react';
import { useAuthV2 } from '../../auth/hooks/useAuthV2';
import { useConnectorsV2 } from '../../connectors/hooks/useConnectorsV2';
import { useAIGateway } from '../../ai/hooks/useAIGateway';
import { jobsServiceV2, QueueStats } from '../../jobs/services/jobsService';
import { LoadingState, EmptyState, ErrorDisplay } from '../../shared/components';

interface V2DashboardProps {
  className?: string;
}

/**
 * Global V2 Dashboard.
 * Shows real backend state for every V2 subsystem. When a subsystem's
 * feature flag is disabled or its endpoint is not configured, the card
 * shows an explicit "Not configured" state — never fake success data.
 */
export function V2Dashboard({ className = '' }: V2DashboardProps) {
  const { user, authenticated, loading: authLoading, featureFlags } = useAuthV2();
  const {
    connectors,
    loading: connectorsLoading,
    error: connectorsError,
  } = useConnectorsV2();
  const {
    providers,
    models,
    loading: aiLoading,
    error: aiError,
  } = useAIGateway();
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null);
  const [jobsConfigured, setJobsConfigured] = useState<boolean | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      const response = await jobsServiceV2.getQueueStats();
      if (response.success) {
        setQueueStats(response.data);
        setJobsConfigured(true);
      } else if (response.error?.statusCode === 404) {
        setJobsConfigured(false);
      }
    } catch {
      setJobsConfigured(false);
    }
  }, []);

  useEffect(() => {
    if (authenticated) fetchJobs();
  }, [authenticated, fetchJobs]);

  if (authLoading) {
    return <LoadingState message="Loading dashboard..." fullScreen />;
  }

  const activeConnectors = connectors.filter(c => c.status === 'active' || c.enabled).length;
  const enabledProviders = providers.filter(p => p.enabled).length;
  const activeModels = models.filter(m => m.status === 'active' && m.healthStatus === 'healthy').length;

  const flags = featureFlags || {};

  return (
    <div className={`v2-dashboard ${className}`} style={{ maxWidth: '1300px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#1f2937', margin: '0 0 0.5rem' }}>
            V2 Dashboard
          </h1>
          <p style={{ color: '#6b7280', margin: 0 }}>
            Architecture v2 — additive systems (disabled by default)
          </p>
        </div>
        {authenticated && user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: '#dbeafe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#1d4ed8',
              fontWeight: 600,
            }}>
              {(user.email || user.id).charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 600, color: '#1f2937', fontSize: '0.875rem' }}>
                {user.email || user.id.slice(0, 12)}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Role: {user.role}</div>
            </div>
          </div>
        ) : (
          <a
            href="/v2/auth"
            style={{ padding: '0.625rem 1.25rem', backgroundColor: '#3b82f6', color: 'white', borderRadius: '0.375rem', fontWeight: 500, textDecoration: 'none', fontSize: '0.875rem' }}
          >
            Sign in to V2
          </a>
        )}
      </div>

      {/* Feature flag status strip */}
      <div style={{
        padding: '1rem 1.25rem',
        backgroundColor: '#fffbeb',
        border: '1px solid #fde68a',
        borderRadius: '0.5rem',
        marginBottom: '2rem',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.5rem',
        alignItems: 'center',
      }}>
        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#92400e', marginRight: '0.5rem' }}>
          Feature Flags:
        </span>
        {Object.entries(flags).length === 0 ? (
          <span style={{ fontSize: '0.8125rem', color: '#92400e' }}>
            Not reported by backend — all V2 features default to disabled
          </span>
        ) : (
          Object.entries(flags).map(([flag, enabled]) => (
            <span
              key={flag}
              style={{
                padding: '0.25rem 0.625rem',
                borderRadius: '9999px',
                fontSize: '0.7rem',
                fontWeight: 600,
                backgroundColor: enabled ? '#dcfce7' : '#f3f4f6',
                color: enabled ? '#166534' : '#6b7280',
                fontFamily: 'monospace',
              }}
              title={flag}
            >
              {flag.replace('_ENABLED', '')}: {enabled ? 'ON' : 'OFF'}
            </span>
          ))
        )}
      </div>

      {/* Subsystem cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {/* Auth card */}
        <SubsystemCard
          title="Authentication"
          description="Supabase Auth JWT sessions and devices"
          status={flags.NEW_AUTH_ENABLED ? 'ok' : 'disabled'}
          link="/v2/auth"
          stats={[
            { label: 'Signed in', value: authenticated ? 'Yes' : 'No' },
            { label: 'Role', value: user?.role || '—' },
          ]}
        />

        {/* Connectors card */}
        <SubsystemCard
          title="Connectors"
          description="External service integrations (14 providers)"
          status={flags.NEW_CONNECTOR_ENGINE_ENABLED ? (connectorsError ? 'error' : 'ok') : 'disabled'}
          link="/v2/connectors"
          loading={connectorsLoading}
          stats={[
            { label: 'Available', value: connectors.length.toString() },
            { label: 'Active', value: activeConnectors.toString() },
          ]}
        />

        {/* AI Gateway card */}
        <SubsystemCard
          title="AI Gateway"
          description="Multi-provider model routing & fallback"
          status={flags.NEW_AI_GATEWAY_ENABLED ? (aiError ? 'error' : 'ok') : 'disabled'}
          link="/v2/ai"
          loading={aiLoading}
          stats={[
            { label: 'Providers', value: enabledProviders.toString() },
            { label: 'Healthy models', value: activeModels.toString() },
          ]}
        />

        {/* API Keys card */}
        <SubsystemCard
          title="API Keys"
          description="Hashed keys with scopes & rotation"
          status={flags.NEW_API_KEYS_ENABLED ? 'ok' : 'disabled'}
          link="/v2/api-keys"
        />

        {/* Security card */}
        <SubsystemCard
          title="Security Center"
          description="Sessions, devices, security events"
          status={flags.NEW_AUTH_ENABLED ? 'ok' : 'disabled'}
          link="/v2/security"
        />

        {/* Audit card */}
        <SubsystemCard
          title="Audit Logs"
          description="Security-sensitive operation trail"
          status={flags.NEW_AUDIT_ENABLED ? 'ok' : 'disabled'}
          link="/v2/audit"
        />

        {/* Usage card */}
        <SubsystemCard
          title="Usage & Quotas"
          description="Plan limits and consumption tracking"
          status={flags.NEW_QUOTA_ENABLED ? 'ok' : 'disabled'}
          link="/v2/usage"
        />

        {/* Jobs card */}
        <SubsystemCard
          title="Background Jobs"
          description="Async queue: syncs, webhooks, refreshes"
          status={jobsConfigured === null ? 'disabled' : jobsConfigured ? 'ok' : 'disabled'}
          link="/v2/jobs"
          stats={queueStats ? [
            { label: 'Queued', value: queueStats.pending.toString() },
            { label: 'Failed', value: queueStats.failed.toString() },
          ] : undefined}
        />

        {/* Admin card */}
        <SubsystemCard
          title="Admin"
          description="Server-verified administration"
          status={user?.role === 'admin' || user?.role === 'super_admin' ? 'ok' : 'disabled'}
          link="/v2/admin"
        />

        {/* Providers card */}
        <SubsystemCard
          title="Provider Management"
          description="Health checks & model registry"
          status={flags.NEW_AI_GATEWAY_ENABLED ? 'ok' : 'disabled'}
          link="/v2/providers"
        />
      </div>
    </div>
  );
}

type CardStatus = 'ok' | 'disabled' | 'error';

function SubsystemCard({
  title,
  description,
  status,
  link,
  stats,
  loading,
}: {
  title: string;
  description: string;
  status: CardStatus;
  link: string;
  stats?: Array<{ label: string; value: string }>;
  loading?: boolean;
}) {
  const statusConfig: Record<CardStatus, { label: string; bg: string; color: string }> = {
    ok: { label: 'Enabled', bg: '#dcfce7', color: '#166534' },
    disabled: { label: 'Not configured', bg: '#f3f4f6', color: '#6b7280' },
    error: { label: 'Error', bg: '#fef2f2', color: '#991b1b' },
  };
  const config = statusConfig[status];

  return (
    <div style={{
      background: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: '0.75rem',
      padding: '1.5rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1f2937', margin: '0 0 0.25rem' }}>
            {title}
          </h3>
          <p style={{ fontSize: '0.8125rem', color: '#6b7280', margin: 0 }}>
            {description}
          </p>
        </div>
        <span style={{
          padding: '0.25rem 0.625rem',
          borderRadius: '9999px',
          fontSize: '0.65rem',
          fontWeight: 600,
          backgroundColor: config.bg,
          color: config.color,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          whiteSpace: 'nowrap',
        }}>
          {config.label}
        </span>
      </div>

      {loading ? (
        <div style={{ height: '40px', display: 'flex', alignItems: 'center' }}>
          <LoadingState message="Loading..." size="sm" />
        </div>
      ) : stats && stats.length > 0 ? (
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          {stats.map(stat => (
            <div key={stat.label}>
              <div style={{ fontSize: '0.7rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {stat.label}
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1f2937' }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      ) : status === 'disabled' ? (
        <p style={{ fontSize: '0.8125rem', color: '#9ca3af', fontStyle: 'italic', margin: 0 }}>
          Enable the corresponding feature flag to activate this subsystem.
        </p>
      ) : null}

      <a
        href={link}
        style={{
          marginTop: 'auto',
          padding: '0.5rem 1rem',
          borderRadius: '0.375rem',
          backgroundColor: status === 'ok' ? '#3b82f6' : '#f3f4f6',
          color: status === 'ok' ? 'white' : '#6b7280',
          border: '1px solid #d1d5db',
          fontWeight: 500,
          fontSize: '0.875rem',
          textDecoration: 'none',
          textAlign: 'center',
          display: 'block',
        }}
      >
        Open {title} →
      </a>
    </div>
  );
}

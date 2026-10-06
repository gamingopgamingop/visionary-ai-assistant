import React, { useMemo } from 'react';
import { QuotaCheckResult, UsageRecord } from '../../ai/services/aiGatewayService';
import { LoadingState, EmptyState, ErrorDisplay } from '../../shared/components';
import { useUsageQuotas, useUsageSummary, RESOURCE_LABELS } from '../hooks/useUsage';

interface UsageDashboardProps {
  userId?: string | null;
  className?: string;
}

export function UsageDashboard({ userId, className = '' }: UsageDashboardProps) {
  // userId comes from the authenticated user via useAuthV2 at the page level;
  // for now we fetch without a specific user (backend resolves from session).
  const { quotas, loading: quotasLoading, error: quotasError, refetch: refetchQuotas } = useUsageQuotas(userId ?? null);
  const { summary, daily, records, loading: usageLoading, error: usageError, refetch: refetchUsage } = useUsageSummary(userId ?? null);

  const loading = quotasLoading || usageLoading;
  const error = quotasError || usageError;

  if (loading) {
    return <LoadingState message="Loading usage and quotas..." />;
  }

  if (error) {
    return <ErrorDisplay error={error} onRetry={() => { refetchQuotas(); refetchUsage(); }} />;
  }

  const hasData = quotas.length > 0 || summary !== null;

  return (
    <div className={`v2-usage-dashboard ${className}`} style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#1f2937', margin: '0 0 0.5rem' }}>
          Usage & Quotas
        </h1>
        <p style={{ color: '#6b7280', margin: 0 }}>
          Track resource consumption and plan limits
        </p>
      </div>

      {!hasData ? (
        <EmptyState
          title="No usage data"
          description="Usage and quota data will appear here once the AI gateway and quota system are enabled and in use."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Quota cards */}
          {quotas.length > 0 && (
            <section>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1f2937', margin: '0 0 1rem' }}>
                Quotas
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                {quotas.map(quota => (
                  <QuotaCard key={quota.resourceType} quota={quota} />
                ))}
              </div>
            </section>
          )}

          {/* Usage breakdown */}
          {summary && Object.keys(summary).length > 0 && (
            <section>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1f2937', margin: '0 0 1rem' }}>
                Usage Summary
              </h2>
              <UsageBreakdown summary={summary} />
            </section>
          )}

          {/* Daily chart */}
          {daily && Object.keys(daily).length > 0 && (
            <section>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1f2937', margin: '0 0 1rem' }}>
                Daily Activity
              </h2>
              <UsageChart daily={daily} />
            </section>
          )}

          {/* Recent records */}
          {records.length > 0 && (
            <section>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1f2937', margin: '0 0 1rem' }}>
                Recent Usage Records
              </h2>
              <UsageHistory records={records} />
            </section>
          )}
        </div>
      )}
    </div>
  );
}

export function QuotaCard({ quota }: { quota: QuotaCheckResult }) {
  const label = RESOURCE_LABELS[quota.resourceType] || quota.resourceType;
  const unlimited = quota.limit >= 999999;
  const percent = unlimited ? 0 : quota.limit > 0 ? Math.min(100, ((quota.limit - quota.remaining) / quota.limit) * 100) : 0;
  const used = quota.limit - quota.remaining;

  const barColor = percent >= 90 ? '#ef4444' : percent >= 75 ? '#f59e0b' : '#10b981';

  const resetDate = quota.resetAt ? new Date(quota.resetAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }) : null;

  return (
    <div
      style={{
        background: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '0.75rem',
        padding: '1.5rem',
      }}
      role="group"
      aria-label={`Quota for ${label}`}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#1f2937', margin: 0 }}>
          {label}
        </h3>
        {!unlimited && (
          <span style={{
            padding: '0.125rem 0.5rem',
            borderRadius: '9999px',
            fontSize: '0.7rem',
            fontWeight: 600,
            backgroundColor: percent >= 90 ? '#fef2f2' : percent >= 75 ? '#fef3c7' : '#dcfce7',
            color: percent >= 90 ? '#991b1b' : percent >= 75 ? '#92400e' : '#166534',
          }}>
            {Math.round(percent)}% used
          </span>
        )}
        {unlimited && (
          <span style={{
            padding: '0.125rem 0.5rem',
            borderRadius: '9999px',
            fontSize: '0.7rem',
            fontWeight: 600,
            backgroundColor: '#dbeafe',
            color: '#1d4ed8',
          }}>
            Unlimited
          </span>
        )}
      </div>

      {unlimited ? (
        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1d4ed8' }}>
          {used.toLocaleString()} <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#6b7280' }}>used</span>
        </div>
      ) : (
        <>
          {/* Progress bar */}
          <div
            style={{
              height: '8px',
              backgroundColor: '#e5e7eb',
              borderRadius: '4px',
              overflow: 'hidden',
              marginBottom: '0.75rem',
            }}
            role="progressbar"
            aria-valuenow={Math.round(percent)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${label} usage`}
          >
            <div style={{ height: '100%', width: `${percent}%`, backgroundColor: barColor, transition: 'width 0.3s ease' }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
            <span style={{ color: '#374151', fontWeight: 500 }}>
              {used.toLocaleString()} used
            </span>
            <span style={{ color: '#6b7280' }}>
              {quota.remaining.toLocaleString()} of {quota.limit.toLocaleString()} left
            </span>
          </div>
        </>
      )}

      {resetDate && (
        <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#9ca3af' }}>
          Resets: {resetDate}
        </div>
      )}
    </div>
  );
}

export function UsageBreakdown({ summary }: { summary: Record<string, number> }) {
  const entries = Object.entries(summary).sort(([, a], [, b]) => b - a);
  const max = Math.max(...entries.map(([, v]) => v), 1);

  return (
    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.75rem', padding: '1.5rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {entries.map(([resource, quantity]) => (
          <div key={resource}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem', fontSize: '0.875rem' }}>
              <span style={{ fontWeight: 500, color: '#374151' }}>
                {RESOURCE_LABELS[resource] || resource}
              </span>
              <span style={{ color: '#1f2937', fontWeight: 600 }}>
                {quantity.toLocaleString()}
              </span>
            </div>
            <div style={{ height: '6px', backgroundColor: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${(quantity / max) * 100}%`,
                  backgroundColor: '#3b82f6',
                  borderRadius: '3px',
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function UsageChart({ daily }: { daily: Record<string, Record<string, number>> }) {
  const dates = Object.keys(daily).sort();
  const resourceTypes = [...new Set(dates.flatMap(d => Object.keys(daily[d])))];

  // Simple bar chart without external chart library
  const dailyTotals = dates.map(date => ({
    date,
    total: Object.values(daily[date]).reduce((sum, v) => sum + v, 0),
  }));
  const maxTotal = Math.max(...dailyTotals.map(d => d.total), 1);

  return (
    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.75rem', padding: '1.5rem', overflowX: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '160px', minWidth: dates.length * 20 }}>
        {dailyTotals.map(({ date, total }) => (
          <div
            key={date}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', minWidth: '16px' }}
            title={`${date}: ${total.toLocaleString()}`}
          >
            <div
              style={{
                width: '100%',
                maxWidth: '24px',
                height: `${Math.max(2, (total / maxTotal) * 130)}px`,
                backgroundColor: '#3b82f6',
                borderRadius: '2px 2px 0 0',
              }}
            />
            <span style={{ fontSize: '0.5625rem', color: '#9ca3af', writingMode: 'horizontal-tb', whiteSpace: 'nowrap' }}>
              {date.slice(5)}
            </span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.75rem', color: '#6b7280' }}>
        {resourceTypes.map(rt => (
          <span key={rt} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
            <span style={{ width: '8px', height: '8px', backgroundColor: '#3b82f6', borderRadius: '2px', display: 'inline-block' }} />
            {RESOURCE_LABELS[rt] || rt}
          </span>
        ))}
      </div>
    </div>
  );
}

export function UsageHistory({ records }: { records: UsageRecord[] }) {
  return (
    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.75rem', overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '500px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <th style={headerStyle}>When</th>
              <th style={headerStyle}>Resource</th>
              <th style={headerStyle}>Model</th>
              <th style={headerStyle}>Quantity</th>
            </tr>
          </thead>
          <tbody>
            {records.slice(0, 20).map((record, index) => (
              <tr key={index} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ ...cellStyle, color: '#6b7280', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>
                  {new Date(record.timestamp).toLocaleString()}
                </td>
                <td style={{ ...cellStyle, fontWeight: 500 }}>
                  {RESOURCE_LABELS[record.resourceType] || record.resourceType}
                </td>
                <td style={{ ...cellStyle, fontFamily: 'monospace', fontSize: '0.75rem', color: '#6b7280' }}>
                  {record.modelId || '—'}
                </td>
                <td style={{ ...cellStyle, fontWeight: 600 }}>
                  {record.quantity.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const headerStyle: React.CSSProperties = {
  padding: '0.75rem 1rem',
  textAlign: 'left',
  fontSize: '0.75rem',
  fontWeight: 600,
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const cellStyle: React.CSSProperties = {
  padding: '0.75rem 1rem',
  verticalAlign: 'middle',
  fontSize: '0.875rem',
  color: '#1f2937',
};

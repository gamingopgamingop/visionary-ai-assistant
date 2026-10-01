import React, { useState, useEffect } from 'react';
import { useAIUsage, UseAIUsageReturn } from '../hooks/useAIGateway';
import { LoadingState, EmptyState, ErrorDisplay } from '../../../shared/components';

interface AIUsageIndicatorProps {
  userId: string;
  className?: string;
  showSummary?: boolean;
  showBreakdown?: boolean;
  showHistory?: boolean;
}

export function AIUsageIndicator({ 
  userId, 
  className = '', 
  showSummary = true, 
  showBreakdown = true, 
  showHistory = false 
}: AIUsageIndicatorProps) {
  const { usage, summary, loading, error, refetch, getUsageSummary, getUsageByModel, getUsageByProvider, getDaily } = useAIUsage(userId);

  if (loading) {
    return <LoadingState message="Loading usage..." />;
  }

  if (error) {
    return <ErrorDisplay error={error} onRetry={() => refetch()} />;
  }

  return (
    <div className={`v2-ai-usage-indicator ${className}`} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {showSummary && summary && (
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1f2937', margin: '0 0 1rem' }}>
            Usage Summary
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
            {Object.entries(summary).map(([resource, value]) => (
              <div key={resource} style={{ padding: '1rem', background: '#f9fafb', borderRadius: '0.375rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {resource.replace(/_/g, ' ')}
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1f2937', marginTop: '0.25rem' }}>
                  {value.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showBreakdown && (
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1f2937', margin: '0 0 1rem' }}>
            Usage by Resource Type
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {Object.entries(summary || {}).map(([resource, value]) => (
              <div key={resource} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '140px', fontSize: '0.875rem', fontWeight: 500, color: '#374151', textTransform: 'capitalize' }}>
                  {resource.replace(/_/g, ' ')}
                </div>
                <div style={{ flex: 1, height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      height: '100%', 
                      width: '100%', 
                      backgroundColor: '#3b82f6',
                      borderRadius: '4px',
                    }} 
                  />
                </div>
                <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#1f2937', minWidth: '80px', textAlign: 'right' }}>
                  {value.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <UsageChart userId={userId} />
      <UsageHistory userId={userId} />
    </div>
  );
}

function UsageChart({ userId }: { userId: string }) {
  const { getDaily } = useAIUsage(userId || '');
  const [dailyData, setDailyData] = useState<Record<string, Record<string, number>> | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchDaily = async () => {
      try {
        const res = await fetch(`/v2/ai-gateway-v2/usage/daily?days=30`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setDailyData(data);
        }
      } catch (err) {
        console.error('Failed to fetch daily usage:', err);
      }
    };
    fetchDaily();
  }, []);

  const dailyData = useMemo(() => {
    if (!dailyData) return [];
    return Object.entries(dailyData || {}).map(([date, resources]) => ({
      date,
      ...resources,
    })).sort((a, b) => a.date.localeCompare(b.date));
  }, []);

  const maxValue = Math.max(...dailyData.flatMap(d => Object.values(d).filter(v => typeof v === 'number') as number[]), 1);

  return (
    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '1.5rem' }}>
      <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1f2937', margin: '0 0 1rem' }}>
        Daily Usage (Last 30 Days)
      </h3>
      <div style={{ height: '200px', display: 'flex', alignItems: 'flex-end', gap: '4px', paddingBottom: '1rem' }}>
        {dailyData.map((day, i) => (
          <div key={day.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
            <div 
              style={{ 
                width: '100%', 
                height: `${Math.max(4, (Object.values(day).reduce((a, v) => a + (typeof v === 'number' ? v : 0), 0) / Math.max(1, Math.max(...Object.values(day).filter(v => typeof v === 'number')))) * 100)}%`,
                minHeight: '4px',
                backgroundColor: '#3b82f6',
                borderRadius: '2px 2px 0 0',
                transition: 'height 0.3s ease',
              }} 
            />
            <span style={{ fontSize: '0.625rem', color: '#9ca3af', transform: 'rotate(-45deg)', whiteSpace: 'nowrap', marginTop: '0.25rem' }}>
              {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6b7280', fontSize: '0.75rem', marginTop: '0.5rem' }}>
        <span>Last 30 days</span>
        <span>Peak: {Math.max(...Object.values(dailyData.reduce((acc, day) => {
          Object.entries(day).forEach(([k, v]) => { if (typeof v === 'number') acc[k] = (acc[k] || 0) + v; }); return acc;
        }, {} as Record<string, number>))) || 0}</span>
      </div>
    </div>
  );
}

export function UsageHistory({ userId }: { userId: string }) {
  return (
    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '1.5rem' }}>
      <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1f2937', margin: '0 0 1rem' }}>
        Usage History
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <UsageHistoryRow resource="AI Requests" current={1247} limit={2000} resetDate="2024-01-15" />
        <UsageHistoryRow resource="Input Tokens" current={45892} limit={100000} resetDate="2024-01-15" />
        <UsageHistoryRow resource="Output Tokens" current={23451} limit={50000} resetDate="2024-01-15" />
        <UsageHistoryRow resource="Images" current={3} limit={10} resetDate="2024-01-15" />
        <UsageHistoryRow resource="Connector Calls" current={89} limit={500} resetDate="2024-01-15" />
        <UsageHistoryRow resource="API Calls" current={5234} limit={10000} resetDate="2024-01-15" />
      </div>
    </div>
  );
}

function UsageHistoryRow({ resource, current, limit, resetDate }: { resource: string; current: number; limit: number; resetDate: string }) {
  const percentage = Math.min(100, (current / limit) * 100);
  const color = percentage > 90 ? '#ef4444' : percentage > 70 ? '#f59e0b' : '#10b981';

  return (
    <div style={{ padding: '0.75rem', background: '#f9fafb', borderRadius: '0.375rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <span style={{ fontWeight: 500, color: '#374151', textTransform: 'capitalize' }}>{resource}</span>
        <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>{current.toLocaleString()} / {limit.toLocaleString()}</span>
      </div>
      <div style={{ height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(100, (current / limit) * 100)}%`, backgroundColor: color, borderRadius: '4px', transition: 'width 0.3s ease' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem', fontSize: '0.75rem', color: '#6b7280' }}>
        <span>{Math.round((current / limit) * 100)}% used</span>
        <span>Resets: {new Date(resetDate).toLocaleDateString()}</span>
      </div>
    </div>
  );
}

export function AIQuotaCard({ resource, current, limit, resetDate, className = '' }: { resource: string; current: number; limit: number; resetDate: string; className?: string }) {
  const percentage = Math.min(100, (current / limit) * 100);
  const color = percentage > 90 ? '#ef4444' : percentage > 70 ? '#f59e0b' : '#10b981';

  return (
    <div className={className} style={{ padding: '1rem', background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <span style={{ fontWeight: 500, color: '#374151', textTransform: 'capitalize' }}>
          {resource.replace(/_/g, ' ')}
        </span>
        <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
          {current.toLocaleString()} / {limit.toLocaleString()}
        </span>
      </div>
      <div style={{ height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(100, percentage)}%`, backgroundColor: color, borderRadius: '4px', transition: 'width 0.3s ease' }} />
      </div>
      <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: '#6b7280', textAlign: 'right' }}>
        Resets: {new Date(resetDate).toLocaleDateString()}
      </div>
    </div>
  );
}

export function AIUsageBreakdown({ userId }: { userId: string }) {
  return (
    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '1.5rem' }}>
      <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1f2937', margin: '0 0 1rem' }}>
        Usage Breakdown
      </h3>
      <UsageChart userId={userId} />
      <UsageHistory userId={userId} />
    </div>
  );
}

export function AIQuotaIndicator({ userId }: { userId: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ padding: '1rem', background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <span style={{ fontWeight: 500, color: '#374151', textTransform: 'capitalize' }}>
            AI Requests
          </span>
          <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            1,247 / 2,000
          </span>
        </div>
        <div style={{ height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: '62%', backgroundColor: '#10b981', borderRadius: '4px', transition: 'width 0.3s ease' }} />
        </div>
        <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: '#6b7280', textAlign: 'right' }}>
          Resets: Jan 15, 2024
        </div>
      </div>

      <div style={{ padding: '1rem', background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <span style={{ fontWeight: 500, color: '#374151', textTransform: 'capitalize' }}>
            AI Tokens
          </span>
          <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            45,892 / 100,000
          </span>
        </div>
        <div style={{ height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: '46%', backgroundColor: '#10b981', borderRadius: '4px' }} />
        </div>
        <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: '#6b7280', textAlign: 'right' }}>
          Resets: Jan 15, 2024
        </div>
      </div>

      <div style={{ padding: '1rem', background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <span style={{ fontWeight: 500, color: '#374151', textTransform: 'capitalize' }}>
            Images
          </span>
          <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            3 / 10
          </span>
        </div>
        <div style={{ height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: '30%', backgroundColor: '#10b981', borderRadius: '4px' }} />
        </div>
        <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: '#6b7280', textAlign: 'right' }}>
          Resets: Jan 15, 2024
        </div>
      </div>
    </div>
  );
}
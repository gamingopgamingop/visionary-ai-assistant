import React, { useState, useEffect, useCallback } from 'react';
import { jobsServiceV2, BackgroundJob, QueueStats, JobStatus, JobType } from '../services/jobsService';
import { LoadingState, EmptyState, ErrorDisplay, Modal } from '../../shared/components';

interface JobDashboardProps {
  className?: string;
}

const STATUS_CONFIG: Record<JobStatus, { bg: string; color: string; label: string }> = {
  pending: { bg: '#f3f4f6', color: '#4b5563', label: 'Queued' },
  running: { bg: '#dbeafe', color: '#1d4ed8', label: 'Running' },
  completed: { bg: '#dcfce7', color: '#166534', label: 'Completed' },
  failed: { bg: '#fef2f2', color: '#991b1b', label: 'Failed' },
  cancelled: { bg: '#f3f4f6', color: '#6b7280', label: 'Cancelled' },
  retrying: { bg: '#fef3c7', color: '#92400e', label: 'Retrying' },
};

const JOB_TYPES: JobType[] = [
  'connector_sync', 'webhook_process', 'token_refresh', 'ai_background_task',
  'document_processing', 'indexing', 'analytics', 'cleanup',
];

export function JobDashboard({ className = '' }: JobDashboardProps) {
  const [jobs, setJobs] = useState<BackgroundJob[]>([]);
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [statusFilter, setStatusFilter] = useState<JobStatus | ''>('');
  const [typeFilter, setTypeFilter] = useState<JobType | ''>('');
  const [selectedJob, setSelectedJob] = useState<BackgroundJob | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [jobsRes, statsRes] = await Promise.all([
        jobsServiceV2.listJobs({
          status: statusFilter || undefined,
          jobType: typeFilter || undefined,
          limit: 50,
        }),
        jobsServiceV2.getQueueStats(),
      ]);

      if (jobsRes.success && jobsRes.data) {
        setJobs(jobsRes.data);
      } else {
        setError(new Error(jobsRes.error?.message || 'Failed to fetch jobs'));
      }
      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch jobs'));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRetry = async (job: BackgroundJob) => {
    setActionLoading(job.id);
    try {
      const response = await jobsServiceV2.retryJob(job.id);
      if (!response.success) {
        setError(new Error(response.error?.message || 'Failed to retry job'));
      }
      await fetchData();
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (job: BackgroundJob) => {
    if (!window.confirm(`Cancel job ${job.id.slice(0, 8)}…?`)) return;
    setActionLoading(job.id);
    try {
      const response = await jobsServiceV2.cancelJob(job.id);
      if (!response.success) {
        setError(new Error(response.error?.message || 'Failed to cancel job'));
      }
      await fetchData();
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className={`v2-job-dashboard ${className}`} style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#1f2937', margin: '0 0 0.5rem' }}>
            Background Jobs
          </h1>
          <p style={{ color: '#6b7280', margin: 0 }}>
            Async job queue — connectors, webhooks, tokens, and more
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          style={{ padding: '0.625rem 1.25rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.375rem', fontWeight: 500, cursor: 'pointer' }}
        >
          Refresh
        </button>
      </div>

      {/* Queue stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <StatCard label="Queued" value={stats.pending} color="#4b5563" />
          <StatCard label="Running" value={stats.running} color="#1d4ed8" />
          <StatCard label="Completed" value={stats.completed} color="#166534" />
          <StatCard label="Failed" value={stats.failed} color="#991b1b" />
          <StatCard label="Total" value={stats.total} color="#1f2937" />
        </div>
      )}

      {/* Filters */}
      <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '1rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ minWidth: '150px' }}>
          <label htmlFor="job-status" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#6b7280', marginBottom: '0.25rem' }}>Status</label>
          <select
            id="job-status"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as JobStatus | '')}
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
          >
            <option value="">All Statuses</option>
            {Object.entries(STATUS_CONFIG).map(([status, config]) => (
              <option key={status} value={status}>{config.label}</option>
            ))}
          </select>
        </div>
        <div style={{ minWidth: '180px' }}>
          <label htmlFor="job-type" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#6b7280', marginBottom: '0.25rem' }}>Job Type</label>
          <select
            id="job-type"
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value as JobType | '')}
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '0.875rem' }}
          >
            <option value="">All Types</option>
            {JOB_TYPES.map(type => (
              <option key={type} value={type}>{formatJobType(type)}</option>
            ))}
          </select>
        </div>
      </div>

      {error && <ErrorDisplay error={error} onRetry={fetchData} />}

      <JobTable
        jobs={jobs}
        loading={loading}
        onSelect={setSelectedJob}
        onRetry={handleRetry}
        onCancel={handleCancel}
        actionLoading={actionLoading}
      />

      {selectedJob && (
        <JobDetails job={selectedJob} onClose={() => setSelectedJob(null)} />
      )}
    </div>
  );
}

export function JobStatusBadge({ status }: { status: JobStatus }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span
      style={{
        padding: '0.25rem 0.625rem',
        borderRadius: '9999px',
        fontSize: '0.7rem',
        fontWeight: 600,
        backgroundColor: config.bg,
        color: config.color,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
      }}
    >
      {status === 'running' && (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ animation: 'spin 1s linear infinite' }}>
          <path d="M12 2a10 10 0 0 1 10 10" />
        </svg>
      )}
      {config.label}
    </span>
  );
}

function JobTable({
  jobs,
  loading,
  onSelect,
  onRetry,
  onCancel,
  actionLoading,
}: {
  jobs: BackgroundJob[];
  loading: boolean;
  onSelect: (job: BackgroundJob) => void;
  onRetry: (job: BackgroundJob) => void;
  onCancel: (job: BackgroundJob) => void;
  actionLoading: string | null;
}) {
  if (loading && jobs.length === 0) {
    return <LoadingState message="Loading jobs..." />;
  }

  if (jobs.length === 0) {
    return (
      <EmptyState
        title="No jobs"
        description="No background jobs match your filters. Jobs are created for connector syncs, webhook processing, token refreshes, and other async work."
      />
    );
  }

  return (
    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.5rem', overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <th style={headerStyle}>Job ID</th>
              <th style={headerStyle}>Type</th>
              <th style={headerStyle}>Status</th>
              <th style={headerStyle}>Attempts</th>
              <th style={headerStyle}>Scheduled</th>
              <th style={headerStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map(job => (
              <tr
                key={job.id}
                style={{ borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }}
                onClick={() => onSelect(job)}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f9fafb')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'white')}
              >
                <td style={{ ...cellStyle, fontFamily: 'monospace', fontSize: '0.75rem', color: '#6b7280' }}>
                  {job.id.slice(0, 8)}…
                </td>
                <td style={{ ...cellStyle, fontWeight: 500 }}>
                  {formatJobType(job.jobType)}
                </td>
                <td style={cellStyle}>
                  <JobStatusBadge status={job.status} />
                </td>
                <td style={{ ...cellStyle, color: '#6b7280' }}>
                  {job.attempts}/{job.maxAttempts}
                </td>
                <td style={{ ...cellStyle, color: '#6b7280', fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>
                  {new Date(job.scheduledAt).toLocaleString()}
                </td>
                <td style={{ ...cellStyle, textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                  <div style={{ display: 'flex', gap: '0.375rem', justifyContent: 'flex-end' }}>
                    {(job.status === 'failed' || job.status === 'cancelled') && (
                      <button
                        onClick={() => onRetry(job)}
                        disabled={actionLoading === job.id}
                        style={{
                          padding: '0.25rem 0.625rem',
                          borderRadius: '0.375rem',
                          backgroundColor: '#dbeafe',
                          color: '#1d4ed8',
                          border: '1px solid #bfdbfe',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          cursor: actionLoading === job.id ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {actionLoading === job.id ? '…' : 'Retry'}
                      </button>
                    )}
                    {(job.status === 'pending' || job.status === 'retrying') && (
                      <button
                        onClick={() => onCancel(job)}
                        disabled={actionLoading === job.id}
                        style={{
                          padding: '0.25rem 0.625rem',
                          borderRadius: '0.375rem',
                          backgroundColor: '#fef2f2',
                          color: '#dc2626',
                          border: '1px solid #fecaca',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          cursor: actionLoading === job.id ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {actionLoading === job.id ? '…' : 'Cancel'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function JobDetails({ job, onClose }: { job: BackgroundJob; onClose: () => void }) {
  return (
    <Modal isOpen={true} onClose={onClose} title={`Job Details — ${formatJobType(job.jobType)}`} size="lg">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <DetailField label="Job ID" value={job.id} mono />
          <DetailField label="Status" value={STATUS_CONFIG[job.status]?.label || job.status} />
          <DetailField label="Type" value={formatJobType(job.jobType)} />
          <DetailField label="Priority" value={job.priority.toString()} />
          <DetailField label="Attempts" value={`${job.attempts} / ${job.maxAttempts}`} />
          <DetailField label="Scheduled" value={new Date(job.scheduledAt).toLocaleString()} />
          {job.startedAt && <DetailField label="Started" value={new Date(job.startedAt).toLocaleString()} />}
          {job.completedAt && <DetailField label="Completed" value={new Date(job.completedAt).toLocaleString()} />}
          {job.nextRetryAt && <DetailField label="Next Retry" value={new Date(job.nextRetryAt).toLocaleString()} />}
        </div>

        {job.error && (
          <div>
            <div style={detailLabelStyle}>Error</div>
            <div style={{
              padding: '0.75rem',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '0.375rem',
              color: '#991b1b',
              fontSize: '0.875rem',
              fontFamily: 'monospace',
              wordBreak: 'break-word',
            }}>
              {job.error}
            </div>
          </div>
        )}

        {job.payload && Object.keys(job.payload).length > 0 && (
          <div>
            <div style={detailLabelStyle}>Payload</div>
            <pre style={{
              backgroundColor: '#1f2937',
              color: '#e5e7eb',
              padding: '1rem',
              borderRadius: '0.5rem',
              fontSize: '0.75rem',
              overflowX: 'auto',
              margin: 0,
            }}>
              {JSON.stringify(job.payload, null, 2)}
            </pre>
          </div>
        )}

        {job.result && Object.keys(job.result).length > 0 && (
          <div>
            <div style={detailLabelStyle}>Result</div>
            <pre style={{
              backgroundColor: '#1f2937',
              color: '#e5e7eb',
              padding: '1rem',
              borderRadius: '0.5rem',
              fontSize: '0.75rem',
              overflowX: 'auto',
              margin: 0,
            }}>
              {JSON.stringify(job.result, null, 2)}
            </pre>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '0.5rem 1.5rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', background: 'white', color: '#374151', fontWeight: 500, cursor: 'pointer' }}>
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '1rem', textAlign: 'center' }}>
      <div style={{ fontSize: '0.75rem', fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </div>
      <div style={{ fontSize: '1.75rem', fontWeight: 700, color, lineHeight: 1.2 }}>
        {value.toLocaleString()}
      </div>
    </div>
  );
}

function DetailField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div style={detailLabelStyle}>{label}</div>
      <div style={{ color: '#1f2937', fontSize: mono ? '0.75rem' : '0.875rem', fontFamily: mono ? 'monospace' : undefined, wordBreak: mono ? 'break-all' : undefined }}>
        {value}
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

const detailLabelStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  fontWeight: 500,
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: '0.25rem',
};

function formatJobType(type: string): string {
  return type
    .split('_')
    .map(word => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

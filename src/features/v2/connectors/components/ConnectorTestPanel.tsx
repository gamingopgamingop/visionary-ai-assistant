import React, { useState, useCallback } from 'react';
import { Modal } from '../../shared/components';

interface ConnectorTestPanelProps {
  connectorId: string;
  connectorName: string;
  onClose?: () => void;
  className?: string;
}

interface TestStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message?: string;
  durationMs?: number;
  requestId?: string;
}

const DEFAULT_STEPS: TestStep[] = [
  { id: 'test-connection', name: 'Connection Test', status: 'pending' },
  { id: 'validate-permissions', name: 'Permission Validation', status: 'pending' },
  { id: 'sample-actions', name: 'Sample Read-Only Call', status: 'pending' },
];

const STEP_TIMEOUT_MS = 30000;

/**
 * ConnectorTestPanel — runs a staged connectivity test against a connector
 * connection via the V2 backend. Every step hits the Edge Function, which
 * performs authentication, authorization, execution, and audit logging
 * server-side. Tokens never reach the UI: only sanitized step results.
 */
export function ConnectorTestPanel({ connectorId, connectorName, onClose, className = '' }: ConnectorTestPanelProps) {
  const [steps, setSteps] = useState<TestStep[]>(DEFAULT_STEPS);
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [overall, setOverall] = useState<'pending' | 'success' | 'partial' | 'error'>('pending');
  const [cancelled, setCancelled] = useState(false);

  const addLog = useCallback((message: string) => {
    const t = new Date().toISOString().split('T')[1].split('.')[0];
    setLogs(prev => [...prev, `[${t}] ${message}`]);
  }, []);

  const runStep = async (step: TestStep): Promise<TestStep> => {
    const start = performance.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), STEP_TIMEOUT_MS);
    try {
      const res = await fetch(`/v2/connector-v2/connectors/${connectorId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        signal: controller.signal,
        body: JSON.stringify({ action: step.id, params: {} }),
      });
      const data = await res.json();
      const durationMs = Math.round(performance.now() - start);
      const ok = res.ok && data?.success === true;
      return {
        ...step,
        status: ok ? 'success' : 'error',
        durationMs,
        requestId: data?.meta?.requestId,
        message: ok ? 'Passed' : data?.error?.message || `HTTP ${res.status}`,
      };
    } catch (err) {
      const durationMs = Math.round(performance.now() - start);
      const aborted = err instanceof DOMException && err.name === 'AbortError';
      return {
        ...step,
        status: 'error',
        durationMs,
        message: aborted ? `Timed out after ${STEP_TIMEOUT_MS / 1000}s` : 'Network error',
      };
    } finally {
      clearTimeout(timeout);
    }
  };

  const runTest = useCallback(async () => {
    setCancelled(false);
    setRunning(true);
    setSteps(DEFAULT_STEPS.map(s => ({ ...s, status: 'pending', message: undefined })));
    setLogs([]);
    setOverall('pending');
    addLog(`Starting test for ${connectorName} (${connectorId})`);

    const results: TestStep[] = [];
    for (const stepDef of DEFAULT_STEPS) {
      if (cancelled) {
        results.push({ ...stepDef, status: 'error', message: 'Cancelled by user' });
        continue;
      }
      addLog(`Running step: ${stepDef.name}…`);
      setSteps(prev => prev.map(s => (s.id === stepDef.id ? { ...s, status: 'running' } : s)));
      const result = await runStep(stepDef);
      results.push(result);
      setSteps(prev => prev.map(s => (s.id === result.id ? result : s)));
      addLog(`${result.name}: ${result.status} (${result.durationMs}ms)${result.message ? ` — ${result.message}` : ''}`);
    }

    const failed = results.filter(r => r.status === 'error').length;
    if (cancelled) setOverall('error');
    else if (failed === 0) setOverall('success');
    else if (failed === results.length) setOverall('error');
    else setOverall('partial');
    addLog(`Test finished: ${failed}/${results.length} steps failed`);
    setRunning(false);
  }, [connectorId, connectorName, cancelled, addLog]);

  const handleAbort = () => {
    setCancelled(true);
    addLog('Abort requested — finishing current step…');
  };

  return (
    <Modal
      isOpen
      onClose={running ? () => {} : onClose}
      title={`Test — ${connectorName}`}
      size="lg"
      closeOnOverlayClick={!running}
      closeOnEscape={!running}
    >
      <div className={`v2-connector-test-panel ${className}`}>
        {/* Steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
          {steps.map((step, index) => (
            <div
              key={step.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                backgroundColor: '#f9fafb',
                borderRadius: '0.5rem',
              }}
            >
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  backgroundColor:
                    step.status === 'success' ? '#dcfce7' :
                    step.status === 'error' ? '#fef2f2' :
                    step.status === 'running' ? '#dbeafe' : '#f3f4f6',
                  color:
                    step.status === 'success' ? '#166534' :
                    step.status === 'error' ? '#991b1b' :
                    step.status === 'running' ? '#1d4ed8' : '#9ca3af',
                }}
                aria-label={`Step ${index + 1}: ${step.status}`}
              >
                {step.status === 'success' ? '✓' : step.status === 'error' ? '✗' : index + 1}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, color: '#1f2937', fontSize: '0.875rem' }}>
                  {step.name}
                  {step.durationMs !== undefined && (
                    <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#6b7280' }}>
                      {step.durationMs}ms
                    </span>
                  )}
                </div>
                {step.message && (
                  <div style={{ fontSize: '0.8125rem', color: step.status === 'error' ? '#991b1b' : '#6b7280' }}>
                    {step.message}
                  </div>
                )}
                {step.requestId && (
                  <div style={{ fontSize: '0.65rem', color: '#9ca3af', fontFamily: 'monospace' }}>
                    Request ID: {step.requestId}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Logs */}
        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1f2937', margin: 0 }}>Test Log</h3>
            {logs.length > 0 && (
              <button onClick={() => setLogs([])} style={{ fontSize: '0.75rem', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer' }}>
                Clear
              </button>
            )}
          </div>
          <div
            style={{
              maxHeight: '160px',
              overflowY: 'auto',
              backgroundColor: '#1f2937',
              borderRadius: '0.375rem',
              padding: '0.75rem',
              fontFamily: 'monospace',
              fontSize: '0.7rem',
              lineHeight: 1.6,
              color: '#d1d5db',
            }}
            role="log"
            aria-live="polite"
          >
            {logs.length === 0 ? 'No logs yet — press "Run Test".' : logs.map((l, i) => <div key={i}>{l}</div>)}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          {running ? (
            <button
              onClick={handleAbort}
              style={{
                padding: '0.5rem 1.25rem',
                backgroundColor: '#fef2f2',
                color: '#dc2626',
                border: '1px solid #fecaca',
                borderRadius: '0.375rem',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Abort
            </button>
          ) : (
            <>
              <button
                onClick={onClose}
                style={{
                  padding: '0.5rem 1.25rem',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
              <button
                onClick={runTest}
                style={{
                  padding: '0.5rem 1.25rem',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                {overall === 'pending' ? 'Run Test' : 'Re-run Test'}
              </button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}

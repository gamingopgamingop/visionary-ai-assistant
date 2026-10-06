import React, { useState, useCallback } from 'react';
import { useConnectorV2 } from '../hooks/useConnectorsV2';
import { LoadingState, EmptyState, ErrorDisplay, Modal, Tabs, TabList, Tab, TabPanels, TabPanel } from '../../shared/components';
import { connectorServiceV2, ConnectionTestResult, ConnectorActionResult } from '../services/connectorService';
import { LoadingState, ErrorDisplay, Modal, Tabs, TabList, Tab, TabPanels, TabPanel } from '../../shared/components';

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
  duration?: number;
  requestId?: string;
  error?: string;
}

const defaultTestSteps: TestStep[] = [
  { id: 'auth', name: 'Authentication', status: 'pending' },
  { id: 'connection', name: 'Connection Test', status: 'pending' },
  { id: 'permissions', name: 'Permission Validation', status: 'pending' },
  { id: 'actions', name: 'Sample Actions', status: 'pending' },
];

export function ConnectorTestPanel({ connectorId, connectorName, onClose, className = '' }: ConnectorTestPanelProps) {
  const { executeAction } = useConnectorV2();
  const [steps, setSteps] = useState<TestStep[]>(defaultTestSteps);
  const [running, setRunning] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [overallResult, setOverallResult] = useState<'pending' | 'success' | 'error' | 'partial'>('pending');
  const [logs, setLogs] = useState<string[]>([]);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  }, []);

  const runTest = useCallback(async () => {
    const controller = new AbortController();
    setAbortController(controller);
    setRunning(true);
    setSteps(defaultTestSteps.map(s => ({ ...s, status: 'pending', message: undefined, duration: undefined, requestId: undefined, error: undefined })));
    setCurrentStepIndex(0);
    setLogs([]);
    setOverallResult('pending');
    addLog(`Starting test for ${connectorName} (${connectorId})`);

    try {
      // Step 1: Authentication
      setCurrentStepIndex(0);
      setSteps(prev => prev.map((s, i) => i === 0 ? { ...s, status: 'running', message: 'Validating credentials...' } : s));
      const startTime = Date.now();
      addLog('Step 1: Validating authentication...');
      
      const authResult = await executeActionWithTimeout(connectorId, 'test-auth', {}, controller);
      const duration = Date.now() - startTime;
      
      if (controller.signal.aborted) throw new Error('Aborted');
      
      setSteps(prev => prev.map((s, i) => i === 0 ? { ...s, status: authResult.success ? 'success' : 'error', message: authResult.message, duration, requestId: authResult.requestId } : s));
      if (!authResult.success) throw new Error(authResult.message || 'Authentication failed');
      addLog(`Authentication successful (${duration}ms)`);

      // Step 2: Connection Test
      setCurrentStepIndex(1);
      setSteps(prev => prev.map((s, i) => i === 1 ? { ...s, status: 'running', message: 'Testing connection...' } : s));
      const connStartTime = Date.now();
      addLog('Step 2: Testing connection...');
      
      const connResult = await executeActionWithTimeout(connectorId, 'test-connection', {}, controller);
      const connDuration = Date.now() - connStartTime;
      
      if (controller.signal.aborted) throw new Error('Aborted');
      
      setSteps(prev => prev.map((s, i) => i === 1 ? { ...s, status: connResult.success ? 'success' : 'error', message: connResult.message, duration: connDuration, requestId: connResult.requestId } : s));
      if (!connResult.success) throw new Error(connResult.message || 'Connection test failed');
      addLog(`Connection test passed (${connDuration}ms)`);

      // Step 3: Permission Validation
      setCurrentStepIndex(2);
      setSteps(prev => prev.map((s, i) => i === 2 ? { ...s, status: 'running', message: 'Validating permissions...' } : s));
      const permStartTime = Date.now();
      addLog('Step 3: Validating permissions...');
      
      const permResult = await executeActionWithTimeout(connectorId, 'validate-permissions', {}, controller);
      const permDuration = Date.now() - permStartTime;
      
      if (controller.signal.aborted) throw new Error('Aborted');
      
      setSteps(prev => prev.map((s, i) => i === 2 ? { ...s, status: permResult.success ? 'success' : 'error', message: permResult.message, duration: permDuration, requestId: permResult.requestId } : s));
      if (!permResult.success) {
        addLog(`Permission validation warning: ${permResult.message}`);
        // Don't throw - permissions might be optional
      } else {
        addLog(`Permissions validated (${permDuration}ms)`);
      }

      // Step 4: Sample Actions
      setCurrentStepIndex(3);
      setSteps(prev => prev.map((s, i) => i === 3 ? { ...s, status: 'running', message: 'Running sample actions...' } : s));
      const actionStartTime = Date.now();
      addLog('Step 4: Running sample actions...');
      
      const actionResult = await executeActionWithTimeout(connectorId, 'sample-actions', {}, controller);
      const actionDuration = Date.now() - actionStartTime;
      
      if (controller.signal.aborted) throw new Error('Aborted');
      
      setSteps(prev => prev.map((s, i) => i === 3 ? { ...s, status: actionResult.success ? 'success' : 'error', message: actionResult.message, duration: actionDuration, requestId: actionResult.requestId } : s));
      if (!actionResult.success) {
        addLog(`Sample actions failed: ${actionResult.message}`);
        // Don't throw - some actions might be optional
      } else {
        addLog(`Sample actions completed (${actionDuration}ms)`);
      }

      // Overall result
      const failedSteps = steps.filter(s => s.status === 'error').length;
      if (failedSteps === 0) {
        setOverallResult('success');
        addLog('All tests passed!');
      } else if (failedSteps === steps.length) {
        setOverallResult('error');
        addLog('All tests failed!');
      } else {
        setOverallResult('partial');
        addLog(`${failedSteps}/${steps.length} tests failed`);
      }

    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        addLog('Test aborted by user');
        setOverallResult('error');
      } else {
        addLog(`Test failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setOverallResult('error');
      }
    } finally {
      setRunning(false);
      setAbortController(null);
    }
  }, [connectorId, connectorName]);

  const executeActionWithTimeout = async (connectionId: string, action: string, params: Record<string, unknown>, controller: AbortController): Promise<ConnectionTestResult> => {
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      // We'll use the connector service to execute actions
      const response = await connectorServiceV2.executeAction(connectionId, action, params);
      return {
        success: response.success,
        message: response.data?.message || response.error?.message,
        data: response.data,
        requestId: response.meta?.requestId,
      };
    } finally {
      clearTimeout(timeout);
    }
  };

  const handleAbort = useCallback(() => {
    if (abortController) {
      abortController.abort();
      addLog('Aborting test...');
    }
  }, [abortController]);

  const handleClose = useCallback(() => {
    if (running && abortController) {
      abortController.abort();
    }
    onClose?.();
  }, [running, abortController, onClose]);

  return (
    <Modal 
      isOpen={true} 
      onClose={handleClose} 
      title={`Test ${connectorName}`}
      size="lg"
      closeOnOverlayClick={!running}
      closeOnEscape={!running}
    >
      <div className={`v2-connector-test-panel ${className}`} style={{ maxWidth: '800px' }}>
        {/* Progress Bar */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <div style={{ flex: 1, height: '6px', backgroundColor: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' }}>
              <div 
                style={{ 
                  height: '100%', 
                  backgroundColor: overallResult === 'success' ? '#10b981' : overallResult === 'error' ? '#ef4444' : '#3b82f6',
                  width: `${(steps.filter(s => s.status === 'success' || s.status === 'error').length / steps.length) * 100}%`,
                  transition: 'width 0.3s ease',
                }} />
              </div>
              <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#374151', minWidth: '100px' }}>
                {steps.filter(s => s.status === 'success' || s.status === 'error').length} / {steps.length}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {steps.map((step, index) => (
                <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flex: 1 }}>
                  <div 
                    style={{ 
                      width: '100%', 
                      height: '4px', 
                      borderRadius: '2px',
                      backgroundColor: step.status === 'success' ? '#10b981' : 
                                     step.status === 'error' ? '#ef4444' : 
                                     step.status === 'running' ? '#3b82f6' : '#e5e7eb',
                      transition: 'all 0.3s ease',
                    }} />
                  <span style={{ fontSize: '0.625rem', color: '#6b7280', whiteSpace: 'nowrap', textAlign: 'center', width: '100%' }}>
                    {step.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Test Steps */}
          <div style={{ marginBottom: '1.5rem' }}>
            {steps.map((step, index) => (
              <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '0.5rem', marginBottom: '0.5rem', transition: 'all 0.2s' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  backgroundColor: step.status === 'success' ? '#dcfce7' : 
                              step.status === 'error' ? '#fef2f2' : 
                              step.status === 'running' ? '#dbeafe' : '#f3f4f6',
                  color: step.status === 'success' ? '#166534' : 
                         step.status === 'error' ? '#991b1b' : 
                         step.status === 'running' ? '#1d4ed8' : '#9ca3af',
                }}>
                    {step.status === 'success' && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 4 12 14.01 9 11.01" /></svg>
                    )}
                    {step.status === 'error' && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                    )}
                    {step.status === 'running' && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin"><circle cx="12" cy="12" r="10" strokeOpacity="0.25" /><path d="M12 2a10 10 0 0 1 10 10" /></svg>
                    )}
                    {step.status === 'pending' && <span style={{ fontWeight: 600, fontSize: '0.75rem' }}>{index + 1}</span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: 500, color: '#1f2937' }}>{step.name}</span>
                      {step.status === 'running' && <span style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: 500 }}>Running...</span>}
                      {step.status === 'success' && <span style={{ fontSize: '0.75rem', color: '#10b981' }}>Completed</span>}
                      {step.status === 'error' && <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>Failed</span>}
                      {step.duration && <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>{step.duration}ms</span>}
                    </div>
                    {step.message && (
                      <div style={{ fontSize: '0.875rem', color: step.status === 'error' ? '#ef4444' : '#6b7280', marginTop: '0.25rem' }}>
                        {step.message}
                      </div>
                    )}
                    {step.requestId && (
                      <div style={{ fontSize: '0.625rem', color: '#9ca3af', marginTop: '0.25rem', fontFamily: 'monospace' }}>
                        Request ID: {step.requestId}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Logs */}
          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1f2937', margin: 0 }}>Test Logs</h3>
              {logs.length > 0 && (
                <button onClick={() => setLogs([])} style={{ fontSize: '0.75rem', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer' }}>Clear</button>
              )}
            </div>
            <div style={{ 
              maxHeight: '200px', 
              overflowY: 'auto', 
              backgroundColor: '#1f2937', 
              borderRadius: '0.5rem', 
              padding: '1rem',
              fontFamily: 'monospace',
              fontSize: '0.75rem',
              lineHeight: 1.6,
            }}>
              {logs.length === 0 ? (
                <p style={{ color: '#6b7280', margin: 0 }}>No logs yet. Click "Run Test" to start.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  {logs.map((log, index) => (
                    <div key={index} style={{ display: 'flex', gap: '0.5rem', color: '#9ca3af' }}>
                      <span style={{ color: '#6b7280', minWidth: '60px' }}>{log.split(']')[0]}]</span>
                      <span style={{ color: log.includes('Failed') || log.includes('failed') ? '#ef4444' : log.includes('passed') || log.includes('passed') || log.includes('success') ? '#10b981' : '#e5e7eb' }}>
                        {log.split(']')[1]?.trim()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb' }}>
            {running ? (
              <button onClick={handleAbort} style={{ padding: '0.625rem 1.25rem', backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '0.375rem', fontWeight: 500, cursor: 'pointer' }}>
                Abort Test
              </button>
            ) : (
              <>
                <button onClick={handleClose} style={{ padding: '0.625rem 1.25rem', backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontWeight: 500, cursor: 'pointer' }}>
                  Close
                </button>
                <button onClick={runTest} disabled={!overallResult || overallResult === 'pending'} style={{ padding: '0.625rem 1.25rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.375rem', fontWeight: 500, cursor: 'pointer' }}>
                  {overallResult ? 'Re-run Test' : 'Run Test'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      </Modal>
  );
}
import { useState, useEffect, useCallback } from 'react';
import { connectorServiceV2, ConnectorConfig, ConnectorConnection, ConnectorActionResult, ConnectionTestResult } from '../services/connectorService';
import { PaginationParams } from '../../../shared/types';

interface UseConnectorsV2Return {
  connectors: ConnectorConfig[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  testConnection: (connectorId: string) => Promise<{ success: boolean; error?: string }>;
  executeAction: (connectorId: string, action: string, params: Record<string, unknown>) => Promise<{ success: boolean; error?: string; data?: unknown }>;
}

export function useConnectorsV2(): UseConnectorsV2Return {
  const [connectors, setConnectors] = useState<ConnectorConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await connectorServiceV2.listConnectors(true);
      
      if (response.success && response.data) {
        setConnectors(response.data);
      } else {
        setError(new Error(response.error?.message || 'Failed to fetch connectors'));
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch connectors'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const testConnection = async (connectorId: string) => {
    setError(null);
    try {
      const response = await connectorServiceV2.testConnection(connectorId);
      
      if (response.success && response.data) {
        return { success: response.data.success, error: response.data.message };
      } else {
        const errorMsg = response.error?.message || 'Failed to test connection';
        return { success: false, error: errorMsg };
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to test connection';
      return { success: false, error: errorMsg };
    }
  };

  const executeAction = async (connectorId: string, action: string, params: Record<string, unknown>) => {
    setError(null);
    try {
      const response = await connectorServiceV2.executeAction(connectorId, action, params);
      
      if (response.success && response.data) {
        return { success: response.data.success, error: response.data.error?.message, data: response.data.data };
      } else {
        const errorMsg = response.error?.message || 'Action failed';
        return { success: false, error: errorMsg };
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Action failed';
      return { success: false, error: errorMsg };
    }
  };

  return {
    connectors,
    loading,
    error,
    refetch,
    testConnection,
    executeAction,
  };
}

interface UseConnectorConnectionsReturn {
  connections: ConnectorConnection[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  createConnection: (request: any) => Promise<{ success: boolean; error?: string; data?: any }>;
  updateConnection: (connectionId: string, request: any) => Promise<{ success: boolean; error?: string; data?: any }>;
  deleteConnection: (connectionId: string) => Promise<{ success: boolean; error?: string }>;
  testConnection: (connectionId: string) => Promise<{ success: boolean; error?: string }>;
  executeAction: (connectionId: string, action: string, params: Record<string, unknown>) => Promise<{ success: boolean; error?: string; data?: unknown }>;
}

export function useConnectorConnections(): UseConnectorConnectionsReturn {
  const [connections, setConnections] = useState<ConnectorConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await connectorServiceV2.listConnections();
      
      if (response.success && response.data) {
        setConnections(response.data);
      } else {
        setError(new Error(response.error?.message || 'Failed to fetch connections'));
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch connections'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const createConnection = async (request: any) => {
    setError(null);
    try {
      const response = await connectorServiceV2.createConnection(request);
      
      if (response.success && response.data) {
        await refetch();
        return { success: true, data: response.data };
      } else {
        const errorMsg = response.error?.message || 'Failed to create connection';
        return { success: false, error: errorMsg };
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create connection';
      return { success: false, error: errorMsg };
    }
  };

  const updateConnection = async (connectionId: string, request: any) => {
    setError(null);
    try {
      const response = await connectorServiceV2.updateConnection(connectionId, request);
      
      if (response.success && response.data) {
        await refetch();
        return { success: true, data: response.data };
      } else {
        const errorMsg = response.error?.message || 'Failed to update connection';
        return { success: false, error: errorMsg };
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update connection';
      return { success: false, error: errorMsg };
    }
  };

  const deleteConnection = async (connectionId: string) => {
    setError(null);
    try {
      const response = await connectorServiceV2.deleteConnection(connectionId);
      
      if (response.success) {
        await refetch();
        return { success: true };
      } else {
        const errorMsg = response.error?.message || 'Failed to delete connection';
        return { success: false, error: errorMsg };
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to delete connection';
      return { success: false, error: errorMsg };
    }
  };

  const testConnection = async (connectionId: string) => {
    setError(null);
    try {
      const response = await connectorServiceV2.testConnection(connectionId);
      
      if (response.success && response.data) {
        return { success: response.data.success, error: response.data.message };
      } else {
        const errorMsg = response.error?.message || 'Failed to test connection';
        return { success: false, error: errorMsg };
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to test connection';
      return { success: false, error: errorMsg };
    }
  };

  const executeAction = async (connectionId: string, action: string, params: Record<string, unknown>) => {
    setError(null);
    try {
      const response = await connectorServiceV2.executeAction(connectionId, action, params);
      
      if (response.success && response.data) {
        return { success: response.data.success, error: response.data.error?.message, data: response.data.data };
      } else {
        const errorMsg = response.error?.message || 'Action failed';
        return { success: false, error: errorMsg };
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Action failed';
      return { success: false, error: errorMsg };
    }
  };

  return {
    connections,
    loading,
    error,
    refetch,
    createConnection,
    updateConnection,
    deleteConnection,
    testConnection,
    executeAction,
  };
}

interface UseConnectorPermissionsReturn {
  permissions: string[];
  loading: boolean;
  error: Error | null;
  refetch: (connectionId: string) => Promise<void>;
  addPermission: (connectionId: string, permission: string) => Promise<{ success: boolean; error?: string }>;
  removePermission: (connectionId: string, permission: string) => Promise<{ success: boolean; error?: string }>;
}

export function useConnectorPermissions(connectionId: string | null): UseConnectorPermissionsReturn {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async (connId: string) => {
    if (!connId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await connectorServiceV2.getConnectionPermissions(connId);
      
      if (response.success && response.data) {
        setPermissions(response.data);
      } else {
        setError(new Error(response.error?.message || 'Failed to fetch permissions'));
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch permissions'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (connectionId) {
      refetch(connectionId);
    }
  }, [connectionId, refetch]);

  const addPermission = async (connId: string, permission: string) => {
    setError(null);
    try {
      const response = await connectorServiceV2.addPermission(connId, permission);
      
      if (response.success) {
        await refetch(connId);
        return { success: true };
      } else {
        const errorMsg = response.error?.message || 'Failed to add permission';
        return { success: false, error: errorMsg };
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to add permission';
      return { success: false, error: errorMsg };
    }
  };

  const removePermission = async (connId: string, permission: string) => {
    setError(null);
    try {
      const response = await connectorServiceV2.removePermission(connId, permission);
      
      if (response.success) {
        await refetch(connId);
        return { success: true };
      } else {
        const errorMsg = response.error?.message || 'Failed to remove permission';
        return { success: false, error: errorMsg };
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to remove permission';
      return { success: false, error: errorMsg };
    }
  };

  return {
    permissions,
    loading,
    error,
    refetch: connectionId ? () => refetch(connectionId) : () => Promise.resolve(),
    addPermission,
    removePermission,
  };
}

interface UseConnectorOAuthReturn {
  initiateOAuth: (request: { connectorId: string; redirectUri: string; scopes?: string[] }) => Promise<{ success: boolean; error?: string; data?: { authorizationUrl: string; state: string } }>;
  refreshToken: (connectorId: string) => Promise<{ success: boolean; error?: string }>;
  revokeOAuth: (connectorId: string) => Promise<{ success: boolean; error?: string }>;
}

export function useConnectorOAuth(): UseConnectorOAuthReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const initiateOAuth = async (request: { connectorId: string; redirectUri: string; scopes?: string[] }) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await connectorServiceV2.initiateOAuth(request);
      
      if (response.success && response.data) {
        return { success: true, data: response.data };
      } else {
        const errorMsg = response.error?.message || 'Failed to initiate OAuth';
        return { success: false, error: errorMsg };
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to initiate OAuth';
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  const refreshToken = async (connectorId: string) => {
    setError(null);
    try {
      const response = await connectorServiceV2.refreshToken(connectorId);
      
      if (response.success) {
        return { success: true };
      } else {
        const errorMsg = response.error?.message || 'Failed to refresh token';
        return { success: false, error: errorMsg };
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to refresh token';
      return { success: false, error: errorMsg };
    }
  };

  const revokeOAuth = async (connectorId: string) => {
    setError(null);
    try {
      const response = await connectorServiceV2.revokeOAuth(connectorId);
      
      if (response.success) {
        return { success: true };
      } else {
        const errorMsg = response.error?.message || 'Failed to revoke OAuth';
        return { success: false, error: errorMsg };
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to revoke OAuth';
      return { success: false, error: errorMsg };
    }
  };

  return {
    initiateOAuth,
    refreshToken,
    revokeOAuth,
  };
}
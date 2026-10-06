import { useState, useEffect, useCallback } from 'react';
import { authServiceV2, UserIdentityV2, AuthStatusResponse, SessionDataV2, DeviceDataV2, SecurityEventV2 } from '../services/authService';

interface UseAuthV2Return {
  user: UserIdentityV2 | null;
  authenticated: boolean;
  loading: boolean;
  error: Error | null;
  featureFlags: Record<string, boolean>;
  refetch: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, password: string, fullName?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ success: boolean; error?: string }>;
  confirmPasswordReset: (token: string, password: string) => Promise<{ success: boolean; error?: string }>;
}

export function useAuthV2(): UseAuthV2Return {
  const [user, setUser] = useState<UserIdentityV2 | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [featureFlags, setFeatureFlags] = useState<Record<string, boolean>>({});

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await authServiceV2.getAuthStatus();
      
      if (response.success) {
        setAuthenticated(response.data.authenticated);
        setUser(response.data.user || null);
        setFeatureFlags(response.data.featureFlags || {});
      } else {
        setAuthenticated(false);
        setUser(null);
        setFeatureFlags({});
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch auth status'));
      setAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const login = async (email: string, password: string) => {
    setError(null);
    try {
      const response = await authServiceV2.login({ email, password });
      
      if (response.success) {
        setUser(response.data.user);
        setAuthenticated(true);
        return { success: true };
      } else {
        const errorMsg = response.error?.message || 'Login failed';
        setError(new Error(errorMsg));
        return { success: false, error: errorMsg };
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Login failed';
      setError(new Error(errorMsg));
      return { success: false, error: errorMsg };
    }
  };

  const signup = async (email: string, password: string, fullName?: string) => {
    setError(null);
    try {
      const response = await authServiceV2.signup({ email, password, fullName });
      
      if (response.success) {
        setUser(response.data.user);
        setAuthenticated(true);
        return { success: true };
      } else {
        const errorMsg = response.error?.message || 'Signup failed';
        setError(new Error(errorMsg));
        return { success: false, error: errorMsg };
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Signup failed';
      setError(new Error(errorMsg));
      return { success: false, error: errorMsg };
    }
  };

  const logout = async () => {
    setError(null);
    try {
      await authServiceV2.logout();
      setUser(null);
      setAuthenticated(false);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Logout failed'));
    }
  };

  const requestPasswordReset = async (email: string) => {
    setError(null);
    try {
      await authServiceV2.requestPasswordReset({ email });
      return { success: true };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Password reset request failed';
      setError(new Error(errorMsg));
      return { success: false, error: errorMsg };
    }
  };

  const confirmPasswordReset = async (token: string, password: string) => {
    setError(null);
    try {
      await authServiceV2.confirmPasswordReset({ token, password });
      return { success: true };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Password reset failed';
      setError(new Error(errorMsg));
      return { success: false, error: errorMsg };
    }
  };

  return {
    user,
    authenticated,
    loading,
    error,
    featureFlags,
    refetch,
    login,
    signup,
    logout,
    requestPasswordReset,
    confirmPasswordReset,
  };
}

interface UseSessionsV2Return {
  sessions: SessionDataV2[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  revokeSession: (sessionId: string) => Promise<{ success: boolean; error?: string }>;
  revokeAllSessions: (exceptSessionId?: string) => Promise<{ success: boolean; error?: string }>;
}

export function useSessionsV2(): UseSessionsV2Return {
  const [sessions, setSessions] = useState<SessionDataV2[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await authServiceV2.getSessions();
      
      if (response.success) {
        setSessions(response.data);
      } else {
        setError(new Error(response.error?.message || 'Failed to fetch sessions'));
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch sessions'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const revokeSession = async (sessionId: string) => {
    setError(null);
    try {
      const response = await authServiceV2.revokeSession(sessionId);
      
      if (response.success) {
        await refetch();
        return { success: true };
      } else {
        const errorMsg = response.error?.message || 'Failed to revoke session';
        setError(new Error(errorMsg));
        return { success: false, error: errorMsg };
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to revoke session';
      setError(new Error(errorMsg));
      return { success: false, error: errorMsg };
    }
  };

  const revokeAllSessions = async (exceptSessionId?: string) => {
    setError(null);
    try {
      const response = await authServiceV2.revokeAllSessions(exceptSessionId);
      
      if (response.success) {
        await refetch();
        return { success: true };
      } else {
        const errorMsg = response.error?.message || 'Failed to revoke all sessions';
        setError(new Error(errorMsg));
        return { success: false, error: errorMsg };
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to revoke all sessions';
      setError(new Error(errorMsg));
      return { success: false, error: errorMsg };
    }
  };

  return {
    sessions,
    loading,
    error,
    refetch,
    revokeSession,
    revokeAllSessions,
  };
}

interface UseDevicesV2Return {
  devices: DeviceDataV2[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  revokeDevice: (deviceId: string) => Promise<{ success: boolean; error?: string }>;
  trustDevice: (deviceId: string) => Promise<{ success: boolean; error?: string }>;
}

export function useDevicesV2(): UseDevicesV2Return {
  const [devices, setDevices] = useState<DeviceDataV2[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await authServiceV2.getDevices();
      
      if (response.success) {
        setDevices(response.data);
      } else {
        setError(new Error(response.error?.message || 'Failed to fetch devices'));
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch devices'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const revokeDevice = async (deviceId: string) => {
    setError(null);
    try {
      const response = await authServiceV2.revokeDevice(deviceId);
      
      if (response.success) {
        await refetch();
        return { success: true };
      } else {
        const errorMsg = response.error?.message || 'Failed to revoke device';
        setError(new Error(errorMsg));
        return { success: false, error: errorMsg };
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to revoke device';
      setError(new Error(errorMsg));
      return { success: false, error: errorMsg };
    }
  };

  const trustDevice = async (deviceId: string) => {
    setError(null);
    try {
      const response = await authServiceV2.trustDevice(deviceId);
      
      if (response.success) {
        await refetch();
        return { success: true };
      } else {
        const errorMsg = response.error?.message || 'Failed to trust device';
        setError(new Error(errorMsg));
        return { success: false, error: errorMsg };
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to trust device';
      setError(new Error(errorMsg));
      return { success: false, error: errorMsg };
    }
  };

  return {
    devices,
    loading,
    error,
    refetch,
    revokeDevice,
    trustDevice,
  };
}

interface UseSecurityEventsReturn {
  events: SecurityEventV2[];
  total: number;
  loading: boolean;
  error: Error | null;
  refetch: (params?: { 
    eventType?: string; 
    success?: boolean; 
    startDate?: string; 
    endDate?: string;
    limit?: number;
    offset?: number;
  }) => Promise<void>;
  hasMore: boolean;
}

export function useSecurityEvents(initialParams?: {
  eventType?: string;
  success?: boolean;
  startDate?: string;
  endDate?: string;
  limit?: number;
}): UseSecurityEventsReturn {
  const [events, setEvents] = useState<SecurityEventV2[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [params, setParams] = useState({
    eventType: initialParams?.eventType,
    success: initialParams?.success,
    startDate: initialParams?.startDate,
    endDate: initialParams?.endDate,
    limit: initialParams?.limit || 50,
    offset: 0,
  });

  const refetch = useCallback(async (newParams?: typeof params) => {
    const mergedParams = newParams ? { ...params, ...newParams, offset: 0 } : params;
    setParams(mergedParams);
    setLoading(true);
    setError(null);
    
    try {
      const response = await authServiceV2.getSecurityEvents({
        eventType: mergedParams.eventType,
        success: mergedParams.success,
        startDate: mergedParams.startDate,
        endDate: mergedParams.endDate,
        limit: mergedParams.limit,
        offset: mergedParams.offset,
      });
      
      if (response.success) {
        setEvents(response.data.events);
        setTotal(response.data.total);
      } else {
        setError(new Error(response.error?.message || 'Failed to fetch security events'));
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch security events'));
    } finally {
      setLoading(false);
    }
  }, [params]);

  const loadMore = useCallback(async () => {
    setParams(prev => ({ ...prev, offset: prev.offset + prev.limit }));
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return {
    events,
    total,
    loading,
    error,
    refetch,
    hasMore: params.offset + events.length < total,
  };
}
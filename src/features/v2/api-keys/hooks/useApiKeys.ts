import { useState, useEffect, useCallback } from 'react';
import { apiKeysServiceV2, ApiKeyData, CreateApiKeyResponse } from '../services/apiKeysService';

export function useApiKeysV2() {
  const [apiKeys, setApiKeys] = useState<ApiKeyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiKeysServiceV2.listApiKeys();
      if (response.success) {
        setApiKeys(response.data);
      } else {
        setError(new Error(response.error?.message || 'Failed to fetch API keys'));
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch API keys'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const createApiKey = useCallback(async (name: string, scopes: string[], expiresInDays?: number): Promise<{
    success: boolean;
    apiKey?: CreateApiKeyResponse;
    error?: string;
  }> => {
    try {
      const response = await apiKeysServiceV2.createApiKey({ name, scopes, expiresInDays });
      if (response.success) {
        await refetch();
        return { success: true, apiKey: response.data };
      }
      return { success: false, error: response.error?.message || 'Failed to create API key' };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to create API key' };
    }
  }, [refetch]);

  const revokeApiKey = useCallback(async (keyId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await apiKeysServiceV2.revokeApiKey(keyId);
      if (response.success) {
        await refetch();
        return { success: true };
      }
      return { success: false, error: response.error?.message || 'Failed to revoke API key' };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to revoke API key' };
    }
  }, [refetch]);

  const rotateApiKey = useCallback(async (keyId: string): Promise<{
    success: boolean;
    newKey?: CreateApiKeyResponse;
    error?: string;
  }> => {
    try {
      const response = await apiKeysServiceV2.rotateApiKey(keyId);
      if (response.success) {
        await refetch();
        return { success: true, newKey: response.data };
      }
      return { success: false, error: response.error?.message || 'Failed to rotate API key' };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to rotate API key' };
    }
  }, [refetch]);

  const updateScopes = useCallback(async (keyId: string, scopes: string[]): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await apiKeysServiceV2.updateApiKeyScopes(keyId, scopes);
      if (response.success) {
        await refetch();
        return { success: true };
      }
      return { success: false, error: response.error?.message || 'Failed to update scopes' };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to update scopes' };
    }
  }, [refetch]);

  return {
    apiKeys,
    loading,
    error,
    refetch,
    createApiKey,
    revokeApiKey,
    rotateApiKey,
    updateScopes,
  };
}

export function useApiKeysScopes() {
  const [scopes, setScopes] = useState<Array<{ name: string; description: string; resource: string; action: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchScopes = async () => {
      setLoading(true);
      try {
        const response = await apiKeysServiceV2.getAvailableScopes();
        if (response.success) {
          setScopes(response.data);
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch scopes'));
      } finally {
        setLoading(false);
      }
    };
    fetchScopes();
  }, []);

  return { scopes, loading, error };
}

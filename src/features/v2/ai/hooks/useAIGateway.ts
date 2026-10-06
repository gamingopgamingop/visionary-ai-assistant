import { useState, useEffect, useCallback } from 'react';
import { aiGatewayServiceV2, ProviderConfig, ModelConfig, ProviderHealth, ModelHealth, ChatRequest, ChatResponse, EmbeddingRequest, EmbeddingResponse, ImageRequest, ImageResponse, QuotaCheckResult, UsageRecord } from '../services/aiGatewayService';
import { PaginationParams } from '../../shared/types';

interface UseAIGatewayReturn {
  providers: ProviderConfig[];
  models: ModelConfig[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  getProviders: (enabledOnly?: boolean) => Promise<void>;
  getModels: (filters?: { providerId?: string; status?: string; capability?: string }) => Promise<void>;
  chatCompletion: (request: any) => Promise<{ success: boolean; error?: string; data?: any }>;
  checkQuota: (userId: string, resourceType: string, quantity?: number) => Promise<{ success: boolean; error?: string; data?: any }>;
  getUsage: (userId: string, resourceType?: string, startDate?: string, endDate?: string) => Promise<{ success: boolean; error?: string; data?: any }>;
  getUsageSummary: (userId: string, startDate?: string, endDate?: string) => Promise<{ success: boolean; error?: string; data?: any }>;
  checkProviderHealth: (providerId: string) => Promise<{ success: boolean; error?: string; data?: any }>;
  checkModelHealth: (modelId: string) => Promise<{ success: boolean; error?: string; data?: any }>;
  runHealthChecks: () => Promise<{ success: boolean; error?: string; data?: any }>;
}

export function useAIGateway(): UseAIGatewayReturn {
  const [providers, setProviders] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [providersRes, modelsRes] = await Promise.all([
        aiGatewayServiceV2.listProviders(true),
        aiGatewayServiceV2.listModels({ status: 'active' }),
      ]);
      
      if (providersRes.success) {
        setProviders(providersRes.data);
      }
      if (modelsRes.success) {
        setModels(modelsRes.data);
      }
      
      if (!providersRes.success) {
        setError(new Error(providersRes.error?.message || 'Failed to fetch providers'));
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch AI gateway data'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const getProviders = async (enabledOnly = true) => {
    setLoading(true);
    setError(null);
    try {
      const response = await aiGatewayServiceV2.listProviders(enabledOnly);
      if (response.success) {
        setProviders(response.data);
      } else {
        setError(new Error(response.error?.message || 'Failed to fetch providers'));
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch providers'));
    } finally {
      setLoading(false);
    }
  };

  const getModels = async (filters?: { providerId?: string; status?: string; capability?: string }) => {
    setLoading(true);
    setError(null);
    try {
      const response = await aiGatewayServiceV2.listModels(filters);
      if (response.success) {
        setModels(response.data);
      } else {
        setError(new Error(response.error?.message || 'Failed to fetch models'));
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch models'));
    } finally {
      setLoading(false);
    }
  };

  const chatCompletion = async (request: any) => {
    setError(null);
    try {
      const response = await aiGatewayServiceV2.chatCompletion(request);
      if (response.success) {
        return { success: true, data: response.data };
      } else {
        const errorMsg = response.error?.message || 'Chat completion failed';
        setError(new Error(errorMsg));
        return { success: false, error: errorMsg };
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Chat completion failed';
      setError(new Error(errorMsg));
      return { success: false, error: errorMsg };
    }
  };

  const checkQuota = async (userId: string, resourceType: string, quantity = 1) => {
    setError(null);
    try {
      const response = await aiGatewayServiceV2.checkQuota(userId, resourceType, quantity);
      if (response.success) {
        return { success: true, data: response.data };
      } else {
        const errorMsg = response.error?.message || 'Quota check failed';
        setError(new Error(errorMsg));
        return { success: false, error: errorMsg };
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Quota check failed';
      setError(new Error(errorMsg));
      return { success: false, error: errorMsg };
    }
  };

  const getUsage = async (userId: string, resourceType?: string, startDate?: string, endDate?: string) => {
    setError(null);
    try {
      const response = await aiGatewayServiceV2.getUsage(userId, resourceType, startDate, endDate);
      if (response.success) {
        return { success: true, data: response.data };
      } else {
        const errorMsg = response.error?.message || 'Failed to fetch usage';
        setError(new Error(errorMsg));
        return { success: false, error: errorMsg };
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch usage';
      setError(new Error(errorMsg));
      return { success: false, error: errorMsg };
    }
  };

  const getUsageSummary = async (userId: string, startDate?: string, endDate?: string) => {
    setError(null);
    try {
      const response = await aiGatewayServiceV2.getUsageSummary(userId, startDate, endDate);
      if (response.success) {
        return { success: true, data: response.data };
      } else {
        const errorMsg = response.error?.message || 'Failed to fetch usage summary';
        setError(new Error(errorMsg));
        return { success: false, error: errorMsg };
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch usage summary';
      setError(new Error(errorMsg));
      return { success: false, error: errorMsg };
    }
  };

  const checkProviderHealth = async (providerId: string) => {
    setError(null);
    try {
      const response = await aiGatewayServiceV2.checkProviderHealth(providerId);
      if (response.success) {
        return { success: true, data: response.data };
      } else {
        const errorMsg = response.error?.message || 'Health check failed';
        setError(new Error(errorMsg));
        return { success: false, error: errorMsg };
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Health check failed';
      setError(new Error(errorMsg));
      return { success: false, error: errorMsg };
    }
  };

  const checkModelHealth = async (modelId: string) => {
    setError(null);
    try {
      const response = await aiGatewayServiceV2.checkModelHealth(modelId);
      if (response.success) {
        return { success: true, data: response.data };
      } else {
        const errorMsg = response.error?.message || 'Health check failed';
        setError(new Error(errorMsg));
        return { success: false, error: errorMsg };
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Health check failed';
      setError(new Error(errorMsg));
      return { success: false, error: errorMsg };
    }
  };

  const runHealthChecks = async () => {
    setError(null);
    try {
      const response = await aiGatewayServiceV2.runHealthChecks();
      if (response.success) {
        return { success: true, data: response.data };
      } else {
        const errorMsg = response.error?.message || 'Health checks failed';
        setError(new Error(errorMsg));
        return { success: false, error: errorMsg };
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Health checks failed';
      setError(new Error(errorMsg));
      return { success: false, error: errorMsg };
    }
  };

  return {
    providers,
    models,
    loading,
    error,
    refetch,
    getProviders,
    getModels,
    chatCompletion,
    checkQuota,
    getUsage,
    getUsageSummary,
    checkProviderHealth,
    checkModelHealth,
    runHealthChecks,
  };
}

interface UseAIModelsReturn {
  models: any[];
  loading: boolean;
  error: Error | null;
  refetch: (filters?: { providerId?: string; status?: string; capability?: string }) => Promise<void>;
  getBestModel: (capability: string, providerPriority?: string[]) => Promise<{ success: boolean; error?: string; data?: any }>;
}

export function useAIModels(): UseAIModelsReturn {
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async (filters?: { providerId?: string; status?: string; capability?: string }) => {
    setLoading(true);
    setError(null);
    try {
      const response = await aiGatewayServiceV2.listModels(filters);
      if (response.success) {
        setModels(response.data);
      } else {
        setError(new Error(response.error?.message || 'Failed to fetch models'));
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch models'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const getBestModel = async (capability: string, providerPriority?: string[]) => {
    setError(null);
    try {
      const response = await aiGatewayServiceV2.getBestModelForCapability(capability, providerPriority);
      if (response.success) {
        return { success: true, data: response.data };
      } else {
        const errorMsg = response.error?.message || 'Failed to find best model';
        setError(new Error(errorMsg));
        return { success: false, error: errorMsg };
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to find best model';
      setError(new Error(errorMsg));
      return { success: false, error: errorMsg };
    }
  };

  return { models, loading, error, refetch, getBestModel };
}

interface UseAIProvidersReturn {
  providers: any[];
  loading: boolean;
  error: Error | null;
  refetch: (enabledOnly?: boolean) => Promise<void>;
  checkHealth: (providerId: string) => Promise<{ success: boolean; error?: string; data?: any }>;
}

export function useAIProviders(): UseAIProvidersReturn {
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async (enabledOnly = true) => {
    setLoading(true);
    setError(null);
    try {
      const response = await aiGatewayServiceV2.listProviders(enabledOnly);
      if (response.success) {
        setProviders(response.data);
      } else {
        setError(new Error(response.error?.message || 'Failed to fetch providers'));
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch providers'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const checkHealth = async (providerId: string) => {
    setError(null);
    try {
      const response = await aiGatewayServiceV2.checkProviderHealth(providerId);
      if (response.success) {
        return { success: true, data: response.data };
      } else {
        const errorMsg = response.error?.message || 'Health check failed';
        setError(new Error(errorMsg));
        return { success: false, error: errorMsg };
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Health check failed';
      setError(new Error(errorMsg));
      return { success: false, error: errorMsg };
    }
  };

  return { providers, loading, error, refetch, checkHealth };
}

interface UseAIQuotasReturn {
  quotas: any[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  checkQuota: (userId: string, resourceType: string, quantity?: number) => Promise<{ success: boolean; error?: string; data?: any }>;
}

export function useAIQuotas(userId: string | null): UseAIQuotasReturn {
  const [quotas, setQuotas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await aiGatewayServiceV2.getAllQuotas(userId);
      if (response.success) {
        setQuotas(response.data);
      } else {
        setError(new Error(response.error?.message || 'Failed to fetch quotas'));
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch quotas'));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      refetch();
    }
  }, [userId, refetch]);

  const checkQuota = async (uId: string, resourceType: string, quantity = 1) => {
    setError(null);
    try {
      const response = await aiGatewayServiceV2.checkQuota(uId, resourceType, quantity);
      if (response.success) {
        return { success: true, data: response.data };
      } else {
        const errorMsg = response.error?.message || 'Quota check failed';
        setError(new Error(errorMsg));
        return { success: false, error: errorMsg };
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Quota check failed';
      setError(new Error(errorMsg));
      return { success: false, error: errorMsg };
    }
  };

  return { quotas, loading, error, refetch, checkQuota };
}

interface UseAIUsageReturn {
  usage: any[];
  summary: Record<string, number> | null;
  loading: boolean;
  error: Error | null;
  refetch: (resourceType?: string, startDate?: string, endDate?: string) => Promise<void>;
  getSummary: () => Promise<{ success: boolean; error?: string; data?: any }>;
  getByModel: () => Promise<{ success: boolean; error?: string; data?: any }>;
  getByProvider: () => Promise<{ success: boolean; error?: string; data?: any }>;
  getDaily: (days?: number) => Promise<{ success: boolean; error?: string; data?: any }>;
}

export function useAIUsage(userId: string | null): UseAIUsageReturn {
  const [usage, setUsage] = useState<any[]>([]);
  const [summary, setSummary] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async (resourceType?: string, startDate?: string, endDate?: string) => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const [usageRes, summaryRes] = await Promise.all([
        aiGatewayServiceV2.getUsage(userId, undefined, undefined, undefined, 100),
        aiGatewayServiceV2.getUsageSummary(userId),
      ]);
      
      if (usageRes.success) {
        setUsage(usageRes.data);
      }
      if (summaryRes.success) {
        setSummary(summaryRes.data);
      }
      
      if (!usageRes.success) {
        setError(new Error(usageRes.error?.message || 'Failed to fetch usage'));
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch usage'));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      refetch();
    }
  }, [userId, refetch]);

  const getSummary = async () => {
    setError(null);
    try {
      const response = await aiGatewayServiceV2.getUsageSummary(userId || '');
      if (response.success) {
        return { success: true, data: response.data };
      } else {
        const errorMsg = response.error?.message || 'Failed to fetch usage summary';
        setError(new Error(errorMsg));
        return { success: false, error: errorMsg };
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch usage summary';
      setError(new Error(errorMsg));
      return { success: false, error: errorMsg };
    }
  };

  const getByModel = async () => {
    setError(null);
    try {
      const response = await aiGatewayServiceV2.getUsageByModel(userId || '');
      if (response.success) {
        return { success: true, data: response.data };
      } else {
        const errorMsg = response.error?.message || 'Failed to fetch usage by model';
        setError(new Error(errorMsg));
        return { success: false, error: errorMsg };
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch usage by model';
      setError(new Error(errorMsg));
      return { success: false, error: errorMsg };
    }
  };

  const getByProvider = async () => {
    setError(null);
    try {
      const response = await aiGatewayServiceV2.getUsageByProvider(userId || '');
      if (response.success) {
        return { success: true, data: response.data };
      } else {
        const errorMsg = response.error?.message || 'Failed to fetch usage by provider';
        setError(new Error(errorMsg));
        return { success: false, error: errorMsg };
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch usage by provider';
      setError(new Error(errorMsg));
      return { success: false, error: errorMsg };
    }
  };

  const getDaily = async (days = 30) => {
    setError(null);
    try {
      const response = await aiGatewayServiceV2.getDailyUsage(userId || '', days);
      if (response.success) {
        return { success: true, data: response.data };
      } else {
        const errorMsg = response.error?.message || 'Failed to fetch daily usage';
        setError(new Error(errorMsg));
        return { success: false, error: errorMsg };
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch daily usage';
      setError(new Error(errorMsg));
      return { success: false, error: errorMsg };
    }
  };

  return { usage, summary, loading, error, refetch, getSummary, getByModel, getByProvider, getDaily };
}
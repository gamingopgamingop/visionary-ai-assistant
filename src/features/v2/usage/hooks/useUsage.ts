import { useState, useEffect, useCallback } from 'react';
import { aiGatewayServiceV2, QuotaCheckResult, UsageRecord } from '../../ai/services/aiGatewayService';
import { apiClient } from '../../shared/services/apiClient';
import { ApiResponse } from '../../shared/types';

const RESOURCE_LABELS: Record<string, string> = {
  ai_requests: 'AI Requests',
  ai_tokens: 'AI Tokens',
  ai_images: 'Image Generations',
  connector_calls: 'Connector Calls',
  api_calls: 'API Calls',
  storage: 'Storage (MB)',
  background_jobs: 'Background Jobs',
};

export function useUsageQuotas(userId: string | null) {
  const [quotas, setQuotas] = useState<QuotaCheckResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await aiGatewayServiceV2.getAllQuotas(userId);
      if (response.success) {
        setQuotas(response.data);
      } else if (response.error?.statusCode === 404 || response.error?.code === 'NOT_FOUND') {
        setQuotas([]);
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
    refetch();
  }, [refetch]);

  return { quotas, loading, error, refetch };
}

export function useUsageSummary(userId: string | null) {
  const [summary, setSummary] = useState<Record<string, number> | null>(null);
  const [daily, setDaily] = useState<Record<string, Record<string, number>> | null>(null);
  const [records, setRecords] = useState<UsageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async (days = 30) => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, dailyRes, recordsRes] = await Promise.all([
        aiGatewayServiceV2.getUsageSummary(userId),
        aiGatewayServiceV2.getDailyUsage(userId, days),
        aiGatewayServiceV2.getUsage(userId, undefined, undefined, undefined, 50),
      ]);

      if (summaryRes.success) setSummary(summaryRes.data);
      if (dailyRes.success) setDaily(dailyRes.data);
      if (recordsRes.success) setRecords(recordsRes.data);

      const allFailed = !summaryRes.success && !dailyRes.success && !recordsRes.success;
      if (allFailed) {
        setError(new Error(summaryRes.error?.message || 'Failed to fetch usage data'));
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch usage data'));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { summary, daily, records, loading, error, refetch };
}

export { RESOURCE_LABELS };

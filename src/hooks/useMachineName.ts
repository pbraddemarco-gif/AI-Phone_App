/**
 * Machine Name Hook
 * React hook for fetching machine name from performance endpoint
 */

import { useState, useEffect } from 'react';
import { getMachinePerformance } from '../services/machinePerformanceService';

interface UseMachineNameParams {
  machineId: number;
  start: string;
  end: string;
  enabled?: boolean;
}

interface UseMachineNameResult {
  machineName: string | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch machine name from performance endpoint
 */
export function useMachineName(params: UseMachineNameParams): UseMachineNameResult {
  const { machineId, start, end, enabled = true } = params;

  const [machineName, setMachineName] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await getMachinePerformance({
        machineId,
        start,
        end,
        filter: 'PlannedProductionTime:true;204:A Shift',
        dateType: 'calendar',
        intervalBase: 'hour',
        timeBase: 'hour',
        dims: ['50479;2170'],
      });

      if (__DEV__) console.debug('🏭 Machine performance data:', result);
      setMachineName(result.DisplayName || result.MachineName || null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch machine name';
      setError(errorMessage);
      if (__DEV__) console.debug('Machine name fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [machineId, start, end, enabled]);

  return {
    machineName,
    loading,
    error,
    refetch: fetchData,
  };
}

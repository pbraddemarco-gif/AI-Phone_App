/**
 * Production History Hook
 * React hook for fetching and managing production history data
 */

import { useState, useEffect } from 'react';
import {
  getProductionHistory,
  ProductionPoint,
  ProductionMode,
} from '../services/productionHistoryService';

interface UseProductionHistoryParams {
  machineId: number;
  start: string; // ISO date string
  end: string; // ISO date string
  modes?: ProductionMode[];
  timeBase?: 'hour' | 'day' | 'shift';
  intervalBase?: 'hour' | 'day' | 'shift';
  filter?: string;
  dateType?: 'calendar' | 'shift';
  dims?: string[];
  enabled?: boolean; // Optional flag to disable auto-fetch
}

interface UseProductionHistoryResult {
  data: ProductionPoint[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch production history data
 * @param params Production history parameters
 * @returns Object with data, loading, error states and refetch function
 */
export function useProductionHistory(
  params: UseProductionHistoryParams
): UseProductionHistoryResult {
  const {
    machineId,
    start,
    end,
    modes = ['OEE', 'goodparts', 'rejectparts'],
    timeBase = 'hour',
    intervalBase = 'hour',
    dateType = 'calendar',
    filter,
    dims = [],
    enabled = true,
  } = params;

  const [data, setData] = useState<ProductionPoint[]>([]);
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
      const result = await getProductionHistory({
        machineId,
        start,
        end,
        modes,
        timeBase,
        intervalBase,
        filter,
        dateType,
        dims,
      });

      setData(result);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch production history';
      setError(errorMessage);
      console.error('Production history fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [machineId, start, end, enabled]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}

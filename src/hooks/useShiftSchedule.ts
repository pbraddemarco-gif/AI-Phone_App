import { useState, useEffect, useCallback } from 'react';
import { productionService } from '../services/productionService';
import { ShiftConfig } from '../types/api';

interface UseShiftScheduleResult {
  shiftConfig: ShiftConfig | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useShiftSchedule(
  machineId: string,
  mode?: 'current' | 'previous'
): UseShiftScheduleResult {
  const [shiftConfig, setShiftConfig] = useState<ShiftConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await productionService.getMachineShiftSchedules(machineId, mode);
      setShiftConfig(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch shift schedule');
      if (__DEV__) console.debug('Shift schedule fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [machineId, mode]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    shiftConfig,
    isLoading,
    error,
    refresh: fetchData,
  };
}

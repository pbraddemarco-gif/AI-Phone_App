/**
 * useShiftProductionComparison Hook
 * React hook for fetching and managing shift comparison data
 */

import { useState, useEffect } from 'react';
import { getShiftComparisonData } from '../services/shiftProductionService';
import { ShiftHourPoint, ShiftWindow } from '../types/ShiftProduction';

interface UseShiftProductionComparisonResult {
  data: ShiftHourPoint[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

interface UseShiftProductionComparisonParams {
  machineId: number;
  currentShift: ShiftWindow;
  previousShift: ShiftWindow;
}

/**
 * Hook to fetch shift comparison data
 * Automatically refetches when parameters change
 */
export function useShiftProductionComparison(
  params: UseShiftProductionComparisonParams
): UseShiftProductionComparisonResult {
  const { machineId, currentShift, previousShift } = params;

  const [data, setData] = useState<ShiftHourPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  // Fetch data when parameters change
  useEffect(() => {
    let isCancelled = false;

    const fetchData = async () => {
      console.log('🔄 useShiftProductionComparison: Starting fetch');
      setLoading(true);
      setError(null);

      try {
        const result = await getShiftComparisonData({
          machineId,
          currentShift,
          previousShift,
        });

        if (!isCancelled) {
          setData(result);
          console.log('✅ useShiftProductionComparison: Data loaded', result.length, 'hours');
        }
      } catch (err) {
        if (!isCancelled) {
          const errorMessage =
            err instanceof Error ? err.message : 'Failed to fetch shift comparison data';
          setError(errorMessage);
          console.error('❌ useShiftProductionComparison: Error', errorMessage);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();

    // Cleanup function to prevent setting state on unmounted component
    return () => {
      isCancelled = true;
    };
  }, [
    machineId,
    currentShift.start,
    currentShift.end,
    previousShift.start,
    previousShift.end,
    refetchTrigger,
  ]);

  // Manual refetch function
  const refetch = () => {
    console.log('🔄 useShiftProductionComparison: Manual refetch triggered');
    setRefetchTrigger((prev) => prev + 1);
  };

  return { data, loading, error, refetch };
}

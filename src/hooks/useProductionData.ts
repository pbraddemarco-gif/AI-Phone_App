import { useState, useEffect, useCallback } from 'react';
import { productionService } from '../services/productionService';
import {
  MachinePerformance,
  ProductionHistoryParams,
  ProductionDataPoint,
} from '../types/api';

interface UseProductionDataResult {
  performance: MachinePerformance | null;
  productionHistory: ProductionDataPoint[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useProductionData(
  machineId: string,
  params: ProductionHistoryParams
): UseProductionDataResult {
  const [performance, setPerformance] = useState<MachinePerformance | null>(null);
  const [productionHistory, setProductionHistory] = useState<ProductionDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch performance data
      const perfData = await productionService.getMachinePerformance(machineId, {
        start: params.start,
        end: params.end,
        dateType: params.dateType,
        intervalBase: params.intervalBase,
        filter: params.filter,
        dims: params.dims,
      });

      // Fetch production history
      const historyData = await productionService.getProductionHistory(
        machineId,
        params
      );

      setPerformance(perfData);
      setProductionHistory(historyData.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch production data');
      console.error('Production data fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [machineId, params]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    performance,
    productionHistory,
    isLoading,
    error,
    refresh: fetchData,
  };
}

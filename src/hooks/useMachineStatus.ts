import { useState, useEffect } from 'react';
import { productionService } from '../services/productionService';
import { MachineStatus } from '../types/api';

interface UseMachineStatusParams {
  machineId: number;
  enabled?: boolean;
}

interface UseMachineStatusResult {
  status: MachineStatus | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useMachineStatus({
  machineId,
  enabled = true,
}: UseMachineStatusParams): UseMachineStatusResult {
  const [status, setStatus] = useState<MachineStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!enabled) return;

    setLoading(true);
    setError(null);

    try {
      console.log('🔍 Fetching machine status for machine ID:', machineId);
      const statuses = await productionService.getMachineStatus([machineId.toString()]);
      console.log('📊 Machine status API response:', JSON.stringify(statuses, null, 2));
      if (statuses && statuses.length > 0) {
        console.log('✅ Setting status to:', statuses[0]);
        setStatus(statuses[0]);
      } else {
        console.log('⚠️ No status returned from API');
        setStatus(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch machine status';
      setError(errorMessage);
      console.error('❌ Machine status fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [machineId, enabled]);

  return {
    status,
    loading,
    error,
    refetch: fetchData,
  };
}

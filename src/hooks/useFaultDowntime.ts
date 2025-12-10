import { useEffect, useState } from 'react';
import { getFaultDowntime, FaultDowntimeItem } from '../services/faultDowntimeService';

interface UseFaultDowntimeParams {
  machineId: number;
  start: string;
  end: string;
  enabled?: boolean;
}

export function useFaultDowntime({
  machineId,
  start,
  end,
  enabled = true,
}: UseFaultDowntimeParams) {
  const [data, setData] = useState<FaultDowntimeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!enabled) return;

    setLoading(true);
    setError(null);
    try {
      const items = await getFaultDowntime({ machineId, start, end });
      setData(items);
    } catch (e: any) {
      setError(e.message || 'Failed to load fault downtime');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [machineId, start, end, enabled]);

  return { data, loading, error, refetch: fetchData };
}

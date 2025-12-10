import { authApiClient } from './apiClient';

export interface FaultDowntimeItem {
  Description: string;
  FaultDownTime: number; // minutes from API
  Count?: number;
}

export interface FaultsApiResponse {
  Items: FaultDowntimeItem[];
  TotalCount?: number;
}

export interface FaultDowntimeParams {
  machineId: number;
  start: string; // ISO start
  end: string; // ISO end
  count?: number; // number of top faults
  filter?: string; // e.g. PlannedProductionTime:true
  dateType?: 'calendar' | 'shift';
  pageSize?: number;
  OrderBy?: string; // e.g. Count
  ascending?: boolean;
  intervalBase?: 'hour' | 'day' | 'shift';
  timeBase?: 'hour' | 'day' | 'shift';
}

export async function getFaultDowntime(params: FaultDowntimeParams): Promise<FaultDowntimeItem[]> {
  const {
    machineId,
    start,
    end,
    count = 10,
    filter = 'PlannedProductionTime:true',
    dateType = 'calendar',
    pageSize = 10,
    OrderBy = 'Count',
    ascending = false,
    intervalBase = 'hour',
    timeBase = 'hour',
  } = params;

  const qs = new URLSearchParams();
  qs.append('start', start);
  qs.append('end', end);
  qs.append('count', String(count));
  qs.append('filter', filter);
  qs.append('dateType', dateType);
  qs.append('pageSize', String(pageSize));
  qs.append('OrderBy', OrderBy);
  qs.append('ascending', String(ascending));
  qs.append('intervalBase', intervalBase);
  qs.append('timeBase', timeBase);

  const endpoint = `/machines/${machineId}/faults?${qs.toString()}`;

  try {
    const res = await authApiClient.get<FaultsApiResponse>(endpoint);
    return res.data.Items || [];
  } catch (e: any) {
    console.error('Fault downtime fetch error:', e.message);
    throw e;
  }
}

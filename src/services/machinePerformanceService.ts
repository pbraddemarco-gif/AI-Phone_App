/**
 * Machine Performance Service
 * API client for fetching machine performance data including machine name
 */

import { apiClient } from './apiClient';

export interface MachinePerformanceParams {
  machineId: number;
  start: string;
  end: string;
  filter?: string;
  dateType?: 'calendar' | 'shift' | 'CurrentShift' | 'LastShift';
  intervalBase?: string;
  timeBase?: string;
  dims?: string[];
}

export interface MachinePerformanceResponse {
  MachineId: number;
  MachineName: string;
  DisplayName?: string;
  ClientName?: string;
  ParentMachineName?: string;
  // Add other fields as needed when we explore the full response
  [key: string]: any;
}

/**
 * Fetch machine performance data
 * Primary use case: retrieve machine name
 */
export async function getMachinePerformance(
  params: MachinePerformanceParams
): Promise<MachinePerformanceResponse> {
  const {
    machineId,
    start,
    end,
    filter = 'PlannedProductionTime:true;204:A Shift',
    dateType = 'calendar',
    intervalBase = 'hour',
    timeBase = 'hour',
    dims = ['50479;2170'],
  } = params;

  console.log(
    `🏭 Fetching machine performance: /machines/${machineId}/performance?start=${start}&end=${end}`
  );

  const queryParams = new URLSearchParams({
    start,
    end,
    filter,
    dateType,
    intervalBase,
    timeBase,
  });

  dims.forEach((dim, idx) => {
    queryParams.append(`dims[${idx}]`, dim);
  });

  const response = await apiClient.get<MachinePerformanceResponse>(
    `/machines/${machineId}/performance?${queryParams.toString()}`
  );

  console.log('✅ Machine performance response:', response.data);

  return response.data;
}

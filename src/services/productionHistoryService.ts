/**
 * Production History Service
 * Fetches historical production data from the API
 */

import { authApiClient } from './apiClient';

export type ProductionMode = 'OEE' | 'goodparts' | 'rejectparts';

/**
 * Single production data point for a time bucket
 * TODO: Adjust fields based on actual API response shape
 */
export interface ProductionPoint {
  timestamp: string; // ISO date string or time label (e.g., "2025-11-21T14:00:00" or "14:00")
  oee?: number; // Overall Equipment Effectiveness percentage
  goodParts?: number; // Count of good parts produced
  rejectParts?: number; // Count of rejected parts
  // Add more fields as needed based on API response:
  // downtime?: number;
  // availability?: number;
  // performance?: number;
  // quality?: number;
}

/**
 * Parameters for fetching production history
 */
export interface ProductionHistoryParams {
  machineId: number;
  start: string; // ISO date string: "2025-11-21T00:00:00"
  end: string; // ISO date string: "2025-11-21T23:59:59"
  modes?: ProductionMode[]; // Data modes to fetch
  timeBase?: 'hour' | 'day' | 'shift'; // Time aggregation level
  intervalBase?: 'hour' | 'day' | 'shift'; // Interval grouping
  filter?: string; // Filter string (e.g., "PlannedProductionTime:true;274:2nd Shift")
  dateType?: 'calendar' | 'shift'; // Date type for filtering
  dims?: string[]; // Dimension filters (e.g., ["77102;2556"])
}

/**
 * Fetch production history from API
 * @param params Production history parameters
 * @returns Promise resolving to array of production data points
 */
export async function getProductionHistory(
  params: ProductionHistoryParams
): Promise<ProductionPoint[]> {
  const {
    machineId,
    start,
    end,
    modes = ['OEE', 'goodparts', 'rejectparts'],
    timeBase = 'hour',
    intervalBase = 'hour',
    filter,
    dateType = 'calendar',
    dims = [],
  } = params;

  // Build query parameters with array notation (modes[0], modes[1], dims[0], etc.)
  const queryParams = new URLSearchParams();
  queryParams.append('start', start);
  queryParams.append('end', end);
  queryParams.append('timeBase', timeBase);
  queryParams.append('intervalBase', intervalBase);
  queryParams.append('dateType', dateType);

  // Add modes as modes[0], modes[1], etc.
  modes.forEach((mode, index) => {
    queryParams.append(`modes[${index}]`, mode);
  });

  // Add dims as dims[0], dims[1], etc.
  dims.forEach((dim, index) => {
    queryParams.append(`dims[${index}]`, dim);
  });

  // Add optional filter
  if (filter) {
    queryParams.append('filter', filter);
  }

  // Make API request
  const response = await authApiClient.get<ProductionPoint[]>(
    `/machines/${machineId}/productionhistory?${queryParams.toString()}`
  );

  return response.data;
}

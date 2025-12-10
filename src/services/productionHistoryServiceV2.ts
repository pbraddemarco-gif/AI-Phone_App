/**
 * Production Service V2
 * Handles production history API calls with proper DTO types
 */

import { apiClient } from './apiClient';

/**
 * API Response Types (DTO)
 */

export interface HistoryItemDTO {
  DateTime: string; // ISO date string
  Value: number; // Metric value for this time point
  GroupBy: string; // Grouping identifier
  GroupId: number; // Numeric group ID
}

export interface HistoryDTO {
  History: HistoryItemDTO[];
  Id: number;
  Key: string; // Mode identifier: "goodparts", "rejectparts", "downtime", etc.
  ShortName: string;
  ItemOwner: string;
  ItemOwnerId: number;
  TimeBase: string; // "hour", "day", etc.
  Description: string;
  IntervalStart: string; // ISO date string
  IntervalEnd: string; // ISO date string
}

/**
 * Available production modes for API queries
 */
export type ProductionMode =
  | 'goodparts'
  | 'rejectparts'
  | 'totalparts'
  | 'failureparts'
  | 'downtime'
  | 'uptime'
  | 'alarm'
  | 'OEE'
  | 'availability'
  | 'performance'
  | 'quality';

/**
 * Parameters for production history API call
 */
export interface ProductionHistoryParams {
  machineId: number;
  start: string; // ISO date string
  end: string; // ISO date string
  modes: ProductionMode[];
  dateType?: 'calendar' | 'report';
  intervalBase?: 'day' | 'hour' | 'minute';
  timeBase?: 'hour' | 'day' | 'month' | 'year';
  groupBy?: string;
  filter?: string;
  dims?: string[];
}

/**
 * Fetch production history from API
 *
 * Returns one HistoryDTO per mode requested.
 *
 * Mapping modes to HistoryDTO:
 * - Each HistoryDTO.Key contains the mode name (e.g., "goodparts", "rejectparts", "downtime")
 * - Match HistoryDTO by checking Key.toLowerCase() === mode.toLowerCase()
 * - History[] array contains hourly data points with DateTime and Value
 *
 * @param params Production history parameters
 * @returns Promise resolving to array of HistoryDTO (one per mode)
 */
export async function getProductionHistory(params: ProductionHistoryParams): Promise<HistoryDTO[]> {
  const {
    machineId,
    start,
    end,
    modes,
    dateType = 'calendar',
    intervalBase = 'hour',
    timeBase = 'hour',
    groupBy = '',
    filter,
    dims = [],
  } = params;

  // Build query parameters
  const queryParams: Record<string, any> = {
    start,
    end,
    dateType,
    intervalBase,
    timeBase,
    groupBy,
  };

  // Add modes as modes[0], modes[1], etc.
  modes.forEach((mode, index) => {
    queryParams[`modes[${index}]`] = mode;
  });

  // Add dims as dims[0], dims[1], etc.
  dims.forEach((dim, index) => {
    queryParams[`dims[${index}]`] = dim;
  });

  // Add optional filter
  if (filter) {
    queryParams.filter = filter;
  }

  console.log('📊 Fetching production history for machine', machineId);

  try {
    // Use data client via proxy. Prefix with "/api" so proxy forwards to EB "/api/..." path.
    const response = await apiClient.get<HistoryDTO[]>(
      `/api/machines/${machineId}/productionhistory`,
      { params: queryParams }
    );

    console.log('✅ Production history response:', response.data.length, 'modes returned');
    return response.data;
  } catch (error: any) {
    console.error('❌ Production history error:', error.message);
    throw error;
  }
}

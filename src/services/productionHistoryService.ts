/**
 * Production History Service
 * Fetches historical production data from the API
 */

import { authApiClient } from './apiClient';

export type ProductionMode = 'OEE' | 'goodparts' | 'rejectparts' | 'downtime';

/**
 * API response structure for production history
 */
export interface ProductionHistoryResponse {
  Id: number;
  Key: string; // Mode: "OEE", "goodparts", "rejectparts"
  ShortName: string | null;
  ItemOwner: string | null;
  ItemOwnerId: number;
  TimeBase: string;
  Description: string | null;
  IntervalStart: string; // ISO date
  IntervalEnd: string; // ISO date
  History: HistoryDataPoint[];
}

/**
 * Individual data point within History array
 */
export interface HistoryDataPoint {
  TimeStamp: string; // ISO date string
  Value: number; // The actual metric value
  // Add more fields as discovered from API
}

/**
 * Transformed production data point for UI consumption
 */
export interface ProductionPoint {
  timestamp: string; // ISO date string
  oee?: number;
  goodParts?: number;
  rejectParts?: number;
  downtime?: number; // Downtime in minutes
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
    modes = ['OEE', 'goodparts', 'rejectparts', 'downtime'],
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

  const endpoint = `/machines/${machineId}/productionhistory?${queryParams.toString()}`;
  console.log('📊 Fetching production history:', endpoint);

  try {
    // Make API request
    const response = await authApiClient.get<ProductionHistoryResponse[]>(endpoint);

    console.log('✅ Production history response received');
    console.log('📊 Response data length:', response.data.length);
    console.log('📊 Full response:', JSON.stringify(response.data, null, 2));
    
    if (response.data.length > 0) {
      console.log('📊 First item Key:', response.data[0].Key);
      console.log('📊 First item History length:', response.data[0].History?.length || 0);
      if (response.data[0].History && response.data[0].History.length > 0) {
        console.log('📊 First history point:', JSON.stringify(response.data[0].History[0]));
      }
    }

    // Transform the response into ProductionPoint[]
    const transformed = transformApiResponse(response.data);
    console.log('📊 Transformed to', transformed.length, 'production points');
    if (transformed.length > 0) {
      console.log('📊 First transformed point:', JSON.stringify(transformed[0]));
    }
    return transformed;
  } catch (error: any) {
    console.error('❌ Production history error:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      url: error.config?.url,
    });
    throw error;
  }
}

/**
 * Transform API response to ProductionPoint array
 */
function transformApiResponse(responseData: ProductionHistoryResponse[]): ProductionPoint[] {
  // Group by timestamp
  const pointsMap = new Map<string, ProductionPoint>();

  responseData.forEach((modeData) => {
    const mode = modeData.Key.toLowerCase();

    modeData.History.forEach((dataPoint) => {
      const timestamp = dataPoint.TimeStamp;

      if (!pointsMap.has(timestamp)) {
        pointsMap.set(timestamp, { timestamp });
      }

      const point = pointsMap.get(timestamp)!;

      // Map the mode to the appropriate field
      if (mode === 'oee') {
        point.oee = dataPoint.Value;
      } else if (mode === 'goodparts') {
        point.goodParts = dataPoint.Value;
      } else if (mode === 'rejectparts') {
        point.rejectParts = dataPoint.Value;
      } else if (mode === 'downtime') {
        point.downtime = dataPoint.Value;
      }
    });
  });

  // Convert map to array and sort by timestamp
  const points = Array.from(pointsMap.values());
  points.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return points;
}

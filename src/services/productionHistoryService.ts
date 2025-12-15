/**
 * Production History Service
 * Fetches historical production data from the API
 */

import { authApiClient } from './apiClient';

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
 * API response structure for production history
 */
export interface ProductionHistoryResponse {
  History: (HistoryDataPoint | HistoryGroup)[]; // Can be direct points or grouped with Items
  Id: number;
  Key: string; // Mode: "OEE", "goodparts", "rejectparts", "downtime", etc.
  ShortName: string | null;
  ItemOwner: string | null;
  ItemOwnerId: number;
  TimeBase: string;
  Description: string | null;
  IntervalStart: string; // ISO date
  IntervalEnd: string; // ISO date
}

/**
 * Individual data point within History array
 */
export interface HistoryDataPoint {
  DateTime: string; // ISO date string
  Value: number; // The actual metric value
  GroupBy: string | null;
  GroupId: number | null;
}

/**
 * History group that may contain Items array
 */
export interface HistoryGroup {
  GroupBy: string | null;
  Items: HistoryDataPoint[];
  GroupId: number | null;
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
    modes = ['goodparts', 'rejectparts'], // Temporarily remove downtime to test
    timeBase = 'hour',
    intervalBase = 'day', // API default is 'day'
    filter,
    dateType, // Don't set default, let API use its default
    dims = [],
  } = params;

  // Build query parameters with array notation (modes[0], modes[1], dims[0], etc.)
  const queryParams = new URLSearchParams();
  queryParams.append('start', start);
  queryParams.append('end', end);
  queryParams.append('timeBase', timeBase);
  queryParams.append('intervalBase', intervalBase);

  // Only add dateType if explicitly provided
  if (dateType) {
    queryParams.append('dateType', dateType);
  }

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
  if (__DEV__) console.debug('📊 Fetching production history:', endpoint);

  try {
    // Make API request
    const response = await authApiClient.get<ProductionHistoryResponse[]>(endpoint);

    if (__DEV__) console.debug('✅ Production history response received');
    if (__DEV__) console.debug('📊 Response data length:', response.data.length);
    if (__DEV__) console.debug('📊 Full response:', JSON.stringify(response.data, null, 2));

    if (response.data.length > 0) {
      if (__DEV__) console.debug('📊 First item Key:', response.data[0].Key);
      if (__DEV__) console.debug('📊 First item History length:', response.data[0].History?.length || 0);
      if (response.data[0].History && response.data[0].History.length > 0) {
        if (__DEV__) console.debug('📊 First history point:', JSON.stringify(response.data[0].History[0]));
      }
    }

    // Transform the response into ProductionPoint[]
    const transformed = transformApiResponse(response.data);
    if (__DEV__) console.debug('📊 Transformed to', transformed.length, 'production points');
    if (transformed.length > 0) {
      if (__DEV__) console.debug('📊 First transformed point:', JSON.stringify(transformed[0]));
    }
    return transformed;
  } catch (error: any) {
    if (__DEV__) console.debug('❌ Production history error:', {
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

  if (__DEV__) console.debug('🔄 Transforming response data, entries:', responseData.length);

  responseData.forEach((modeData, idx) => {
    const mode = modeData.Key.toLowerCase();
    if (__DEV__) console.debug(
      `🔄 Processing mode ${idx}: ${mode}, History items:`,
      modeData.History?.length || 0
    );

    // Check if History is an array or has nested structure
    let historyItems: HistoryDataPoint[] = [];

    if (Array.isArray(modeData.History)) {
      // History is an array - check if it's HistoryDataPoint[] or has nested Items
      if (modeData.History.length > 0) {
        const firstItem = modeData.History[0];
        if ('Items' in firstItem && Array.isArray(firstItem.Items)) {
          // Nested structure with Items array
          if (__DEV__) console.debug('🔄 Found nested Items structure');
          historyItems = firstItem.Items as HistoryDataPoint[];
        } else if ('DateTime' in firstItem && 'Value' in firstItem) {
          // Direct HistoryDataPoint array
          if (__DEV__) console.debug('🔄 Found direct HistoryDataPoint array');
          historyItems = modeData.History as HistoryDataPoint[];
        }
      }
    }

    if (__DEV__) console.debug(`🔄 Processing ${historyItems.length} history items for ${mode}`);

    historyItems.forEach((dataPoint, dpIdx) => {
      const timestamp = dataPoint.DateTime;

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

      if (dpIdx === 0) {
        if (__DEV__) console.debug(`🔄 First ${mode} point:`, timestamp, 'Value:', dataPoint.Value);
      }
    });
  });

  // Convert map to array and sort by timestamp
  const points = Array.from(pointsMap.values());
  points.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  if (__DEV__) console.debug('🔄 Final transformed points:', points.length);
  if (points.length > 0) {
    if (__DEV__) console.debug('🔄 First point:', JSON.stringify(points[0]));
    if (__DEV__) console.debug('🔄 Last point:', JSON.stringify(points[points.length - 1]));
  }

  return points;
}

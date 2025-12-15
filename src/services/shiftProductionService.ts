/**
 * Shift Production Service
 * Compares current shift vs previous shift production data
 */

import { getProductionHistory, HistoryDTO } from './productionHistoryServiceV2';
import { ShiftHourPoint, ShiftWindow } from '../types/ShiftProduction';

/**
 * Get shift comparison data for current vs previous shift
 *
 * @param params Machine ID and shift windows
 * @returns Array of hourly data points comparing both shifts
 */
export async function getShiftComparisonData(params: {
  machineId: number;
  currentShift: ShiftWindow;
  previousShift: ShiftWindow;
}): Promise<ShiftHourPoint[]> {
  const { machineId, currentShift, previousShift } = params;

  if (__DEV__) console.debug('📊 Fetching shift comparison data for machine', machineId);

  // Fetch both shifts in parallel
  const [currentData, previousData] = await Promise.all([
    getProductionHistory({
      machineId,
      start: currentShift.start,
      end: currentShift.end,
      modes: ['goodparts', 'rejectparts', 'downtime'],
      filter: currentShift.filter,
      dims: currentShift.dims,
      dateType: 'calendar',
      intervalBase: 'hour',
      timeBase: 'hour',
    }),
    getProductionHistory({
      machineId,
      start: previousShift.start,
      end: previousShift.end,
      modes: ['goodparts', 'rejectparts', 'downtime'],
      filter: previousShift.filter,
      dims: previousShift.dims,
      dateType: 'calendar',
      intervalBase: 'hour',
      timeBase: 'hour',
    }),
  ]);

  // Transform API response to hourly comparison data
  const currentHourlyData = buildHourlyMap(currentData);
  const previousHourlyData = buildHourlyMap(previousData);

  // Get union of all hours from both shifts
  const allHours = new Set<string>();
  Object.keys(currentHourlyData).forEach((hour) => allHours.add(hour));
  Object.keys(previousHourlyData).forEach((hour) => allHours.add(hour));

  // Sort hours chronologically
  const sortedHours = Array.from(allHours).sort();

  // Build comparison data points
  const comparisonData: ShiftHourPoint[] = sortedHours.map((hour, index) => {
    const current = currentHourlyData[hour] || { goodparts: 0, rejectparts: 0, downtime: 0 };
    const previous = previousHourlyData[hour] || { goodparts: 0, rejectparts: 0, downtime: 0 };

    // Format hour label (e.g., "07:00", "14:00")
    const hourLabel = formatHourLabel(hour);

    return {
      hourLabel,
      hourIndex: index,
      currentGood: current.goodparts,
      currentReject: current.rejectparts,
      currentDowntime: current.downtime,
      previousGood: previous.goodparts,
      previousReject: previous.rejectparts,
      previousDowntime: previous.downtime,
    };
  });

  if (__DEV__) console.debug('✅ Built comparison data:', comparisonData.length, 'hours');
  return comparisonData;
}

/**
 * Build hourly map from API response
 *
 * Maps each HistoryDTO by its Key (mode) and aggregates by hour.
 *
 * How we identify modes:
 * - Each HistoryDTO has a Key field (e.g., "goodparts", "rejectparts", "downtime")
 * - We match the Key (case-insensitive) to determine which metric it represents
 * - The History[] array contains hourly data points with DateTime and Value
 *
 * @param historyData Array of HistoryDTO from API
 * @returns Map of hour -> metrics
 */
function buildHourlyMap(historyData: HistoryDTO[]): Record<
  string,
  {
    goodparts: number;
    rejectparts: number;
    downtime: number;
  }
> {
  const hourlyMap: Record<string, { goodparts: number; rejectparts: number; downtime: number }> =
    {};

  // Process each mode's data
  historyData.forEach((modeData) => {
    const modeKey = modeData.Key.toLowerCase();

    // Process each hourly data point in the History array
    modeData.History.forEach((dataPoint) => {
      const hour = truncateToHour(dataPoint.DateTime);

      if (!hourlyMap[hour]) {
        hourlyMap[hour] = { goodparts: 0, rejectparts: 0, downtime: 0 };
      }

      // Map the value to the correct metric based on the mode Key
      if (modeKey === 'goodparts') {
        hourlyMap[hour].goodparts = dataPoint.Value;
      } else if (modeKey === 'rejectparts') {
        hourlyMap[hour].rejectparts = dataPoint.Value;
      } else if (modeKey === 'downtime') {
        hourlyMap[hour].downtime = dataPoint.Value;
      }
    });
  });

  return hourlyMap;
}

/**
 * Truncate DateTime to hour (e.g., "2025-11-21T14:30:00" -> "2025-11-21T14:00:00")
 */
function truncateToHour(dateTime: string): string {
  const date = new Date(dateTime);
  date.setMinutes(0, 0, 0);
  return date.toISOString();
}

/**
 * Format hour for display (e.g., "2025-11-21T14:00:00Z" -> "14:00")
 */
function formatHourLabel(dateTime: string): string {
  const date = new Date(dateTime);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

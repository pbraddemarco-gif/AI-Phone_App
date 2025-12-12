/**
 * Production Goal Service
 * Fetches production goals with hourly breakdowns to determine shift start times
 */

import { apiClient } from './apiClient';

export interface ProductionGoalResponse {
  Id: number;
  PartsGoal: number | null;
  PartsAvgHourlyGoal: number | null;
  PartsDetailedHourlyGoals: Record<string, number>; // timestamp -> hourly goal
}

/**
 * Fetch production goals for multiple machines
 * Returns goal data including hourly breakdown with timestamps
 */
export async function getProductionGoals(params: {
  machineIds: number[];
  dateType: 'CurrentShift' | 'LastShift';
}): Promise<ProductionGoalResponse[]> {
  const { machineIds, dateType } = params;

  if (machineIds.length === 0) {
    return [];
  }

  try {
    // Build query string with multiple machine IDs
    const queryParams = new URLSearchParams();
    machineIds.forEach((id) => queryParams.append('ids', id.toString()));
    queryParams.append('dateType', dateType);

    console.log(`🎯 Fetching production goals for ${machineIds.length} machines (${dateType})`);

    const response = await apiClient.get<ProductionGoalResponse[]>(
      `/machines/productiongoal?${queryParams.toString()}`
    );

    console.log(`✅ Production goals fetched: ${response.data?.length || 0} results`);
    return response.data || [];
  } catch (error: any) {
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      console.warn(
        `⚠️ Production goal API timeout for ${machineIds.length} machines - using fallback`
      );
    } else if (error.response?.status === 504) {
      console.warn(`⚠️ Production goal API gateway timeout (504) - using fallback`);
    } else {
      console.error('❌ Failed to fetch production goals:', error.message || error);
    }
    return [];
  }
}

/**
 * Extract shift start time from production goal data
 * Uses the first timestamp in PartsDetailedHourlyGoals
 */
export function getShiftStartFromGoal(goal: ProductionGoalResponse): Date | null {
  if (!goal.PartsDetailedHourlyGoals || Object.keys(goal.PartsDetailedHourlyGoals).length === 0) {
    return null;
  }

  const timestamps = Object.keys(goal.PartsDetailedHourlyGoals).sort();
  const firstTimestamp = timestamps[0];

  try {
    return new Date(firstTimestamp);
  } catch (e) {
    console.error('Failed to parse shift start time:', firstTimestamp, e);
    return null;
  }
}

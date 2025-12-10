/**
 * Shift Schedule Service
 * Fetches shift schedule data with detailed shift info including IDs and TagIDs
 */

import { authApiClient } from './apiClient';
import { ShiftScheduleResponse, ShiftScheduleItem } from '../types/api';

/**
 * Fetch shift schedule for a machine
 * @param machineId - Machine ID
 * @param mode - 'current' for current shift, 'previous' for last shift
 * @returns Promise resolving to shift schedule response with Items array
 */
export async function getShiftSchedule(
  machineId: number,
  mode: 'current' | 'previous' = 'current'
): Promise<ShiftScheduleResponse> {
  const params: any = {
    mode,
  };

  console.log(`📅 Fetching shift schedule for machine ${machineId}, mode: ${mode}`);

  try {
    const response = await authApiClient.get<ShiftScheduleResponse>(
      `/machines/${machineId}/shiftschedules`,
      { params }
    );

    console.log(
      `✅ Shift schedule response: ${response.data.Items?.length || 0} shift(s) returned`
    );

    return response.data;
  } catch (error: any) {
    console.error('❌ Shift schedule error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    throw new Error(
      error?.response?.data?.Message || error?.message || 'Failed to fetch shift schedule'
    );
  }
}

/**
 * Extract shift ID and TagID from shift schedule response
 * Returns the first shift item (typically the active shift)
 */
export function extractShiftInfo(
  scheduleResponse: ShiftScheduleResponse
): { shiftId: number; tagId: number; shiftGroupId: number } | null {
  if (!scheduleResponse.Items || scheduleResponse.Items.length === 0) {
    return null;
  }

  const shift = scheduleResponse.Items[0];
  return {
    shiftId: shift.Id,
    tagId: shift.TagId,
    shiftGroupId: shift.ShiftGroupId,
  };
}

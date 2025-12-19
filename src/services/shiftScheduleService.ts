/**
 * Shift Schedule Service
 * Fetches shift schedule data with detailed shift info including IDs and TagIDs
 */

import { authApiClient } from './apiClient';
import { ShiftScheduleResponse, ShiftScheduleItem } from '../types/api';

/**
 * Format date as ISO string in local time (without UTC conversion)
 * Returns format: "2025-12-11T23:30:00" (no Z suffix)
 */
function toLocalISOString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

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

  if (__DEV__) console.debug(`📅 Fetching shift schedule for machine ${machineId}, mode: ${mode}`);

  try {
    const response = await authApiClient.get<any>(`/machines/${machineId}/shiftschedules`, {
      params,
    });

    // API returns array format: [{TagId, ShiftId, HourStart, ...}] instead of {Items: [...]}
    let shiftData: any;
    if (Array.isArray(response.data)) {
      if (__DEV__)
        console.debug(
          `✅ Shift schedule response: ${response.data.length} shift(s) returned (array format)`
        );
      shiftData = response.data[0]; // Extract first shift from array
    } else if (response.data.Items && Array.isArray(response.data.Items)) {
      if (__DEV__)
        console.debug(
          `✅ Shift schedule response: ${response.data.Items.length} shift(s) returned (Items format)`
        );
      shiftData = response.data.Items[0];
    } else {
      if (__DEV__) console.debug('⚠️ Unexpected shift schedule response format:', response.data);
      return { Items: [], TotalCount: 0 };
    }

    if (!shiftData) {
      if (__DEV__) console.debug('⚠️ No shift data in response');
      return { Items: [], TotalCount: 0 };
    }

    // Log the raw shift data for debugging
    if (__DEV__)
      console.debug('📋 Raw shift data:', {
        ShiftId: shiftData.ShiftId || shiftData.Id,
        TagId: shiftData.TagId,
        HourStart: shiftData.HourStart,
        MinuteStart: shiftData.MinuteStart,
        HourEnd: shiftData.HourEnd,
        MinuteEnd: shiftData.MinuteEnd,
      });

    // Calculate actual calendar dates for this shift
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    // Determine if current shift started today or yesterday
    let startDate: Date;
    let endDate: Date;

    if (mode === 'current') {
      // For current shift, check if shift has started today
      const shiftStartTime = shiftData.HourStart * 60 + shiftData.MinuteStart;
      const currentTime = currentHour * 60 + currentMinute;

      if (currentTime >= shiftStartTime) {
        // Shift started today
        startDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          shiftData.HourStart,
          shiftData.MinuteStart,
          0
        );
      } else {
        // Shift started yesterday
        startDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - 1,
          shiftData.HourStart,
          shiftData.MinuteStart,
          0
        );
      }

      // Calculate end date based on shift duration
      if (
        shiftData.HourEnd < shiftData.HourStart ||
        (shiftData.HourEnd === shiftData.HourStart && shiftData.MinuteEnd < shiftData.MinuteStart)
      ) {
        // Shift crosses midnight
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);
        endDate.setHours(shiftData.HourEnd, shiftData.MinuteEnd, 0, 0);
      } else {
        // Shift within same day
        endDate = new Date(startDate);
        endDate.setHours(shiftData.HourEnd, shiftData.MinuteEnd, 0, 0);
      }
    } else {
      // For previous shift, use the shift's END time as the reference point
      // Previous shift's HourEnd is when the next shift (current) starts
      const nextShiftStartTime = shiftData.HourEnd * 60 + shiftData.MinuteEnd;
      const currentTime = currentHour * 60 + currentMinute;

      // Determine when the previous shift ended (= when current shift started)
      // The HourEnd from previous shift pattern tells us when it ends
      if (currentTime >= nextShiftStartTime) {
        // Next shift (current) started today, so previous ended today
        endDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          shiftData.HourEnd,
          shiftData.MinuteEnd,
          0
        );
      } else {
        // Next shift hasn't started yet today, so previous ended yesterday
        endDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - 1,
          shiftData.HourEnd,
          shiftData.MinuteEnd,
          0
        );
      }

      // Calculate shift duration
      let shiftDurationMs: number;
      if (
        shiftData.HourEnd < shiftData.HourStart ||
        (shiftData.HourEnd === shiftData.HourStart && shiftData.MinuteEnd < shiftData.MinuteStart)
      ) {
        // Shift crosses midnight
        const minutesInShift =
          24 * 60 -
          (shiftData.HourStart * 60 + shiftData.MinuteStart) +
          (shiftData.HourEnd * 60 + shiftData.MinuteEnd);
        shiftDurationMs = minutesInShift * 60 * 1000;
      } else {
        // Shift within same day
        const minutesInShift =
          shiftData.HourEnd * 60 +
          shiftData.MinuteEnd -
          (shiftData.HourStart * 60 + shiftData.MinuteStart);
        shiftDurationMs = minutesInShift * 60 * 1000;
      }

      // Previous shift starts one shift duration before it ends
      startDate = new Date(endDate.getTime() - shiftDurationMs);

      if (__DEV__)
        console.debug('🔍 Previous shift calculation:', {
          shiftEndHour: shiftData.HourEnd,
          shiftEndMinute: shiftData.MinuteEnd,
          nextShiftStartTime,
          currentTime,
          shiftDurationMs,
          shiftDurationHours: shiftDurationMs / (1000 * 60 * 60),
          calculatedStart: startDate.toISOString(),
          calculatedEnd: endDate.toISOString(),
        });
    }

    if (__DEV__)
      console.debug(`📅 Calculated ${mode} shift times:`, {
        start: toLocalISOString(startDate),
        end: toLocalISOString(endDate),
      });

    // Return in expected format with Items array
    const transformedResponse: ShiftScheduleResponse = {
      Items: [
        {
          Id: shiftData.ShiftId || shiftData.Id,
          ShiftId: shiftData.ShiftId || shiftData.Id,
          TagId: shiftData.TagId,
          ShiftGroupId: shiftData.ShiftGroupId || 0,
          Name: shiftData.Name || `Shift ${shiftData.ShiftId || shiftData.Id}`,
          DisplayName:
            shiftData.DisplayName || shiftData.Name || `Shift ${shiftData.ShiftId || shiftData.Id}`,
          Type: shiftData.Type || 'Shift',
          StartDayOfWeekName: shiftData.StartDayOfWeekName || '',
          EndDayOfWeekName: shiftData.EndDayOfWeekName || '',
          HourStart: shiftData.HourStart,
          MinuteStart: shiftData.MinuteStart,
          HourEnd: shiftData.HourEnd,
          MinuteEnd: shiftData.MinuteEnd,
          StartDateTime: toLocalISOString(startDate),
          EndDateTime: toLocalISOString(endDate),
        },
      ],
      TotalCount: 1,
    };

    return transformedResponse;
  } catch (error: any) {
    if (__DEV__) console.debug('❌ Shift schedule error:', error.message);
    if (error.response) {
      if (__DEV__) console.debug('Response status:', error.response.status);
      if (__DEV__) console.debug('Response data:', error.response.data);
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

/**
 * Machine Inventory Service
 * Fetches list of all machines for a plant
 */

import { authApiClient } from './apiClient';

export interface MachineInventoryItem {
  MachineId: number;
  MachineName: string;
  DisplayName?: string;
  Status?: string;
  PlantId?: number;
  PlantName?: string;
  OEE?: number;
  [key: string]: any;
}

/**
 * Fetch all machines for a plant/area
 * Uses the plant-level machine endpoint to get machines for a specific plant
 * @param plantId - The plant/area ID (e.g., 498, 500, 582, etc.)
 * @param shiftType - 'current' for current shift or 'last' for last shift
 * @returns Promise resolving to array of machine inventory items
 */
export async function getMachineInventory(
  plantId: number,
  shiftType: 'current' | 'last' = 'current'
): Promise<MachineInventoryItem[]> {
  // Use API's shift-aware dateType instead of manual calendar day calculation
  const dateType = shiftType === 'current' ? 'CurrentShift' : 'LastShift';

  // Provide placeholder dates - API will use actual shift boundaries based on dateType
  const now = new Date();
  const formatDate = (date: Date) => {
    return date.toISOString().split('.')[0]; // Remove milliseconds, keep format: 2025-12-04T00:00:00
  };

  const params: any = {
    start: formatDate(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)),
    end: formatDate(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 0)),
    filter: 'PlannedProductionTime:true',
    orderBy: 'DataAsOf',
    mode: 'plant',
    ascending: false,
    dateType: dateType,
    pageSize: 100,
    pageNumber: 1,
  };

  try {
    const response = await authApiClient.get<any>(`/machines/${plantId}/machines`, {
      params,
    });

    let machineData: MachineInventoryItem[] = [];

    if (response.data && response.data.Items && Array.isArray(response.data.Items)) {
      machineData = response.data.Items;
    } else if (Array.isArray(response.data)) {
      machineData = response.data;
    } else if (response.data && typeof response.data === 'object') {
      // Try to find array in common property names
      const data = response.data as any;
      const possibleArrays = [
        data.machines,
        data.data,
        data.items,
        data.Machines,
        data.Data,
        // Try all values that are arrays
        ...Object.values(data).filter((v) => Array.isArray(v)),
      ];

      const foundArray = possibleArrays.find((arr) => Array.isArray(arr) && arr.length > 0);
      if (foundArray) {
        machineData = foundArray as any[];
      }
    }

    machineData = machineData
      .map((item: any) => ({
        MachineId: item.Id,
        MachineName: item.Name || item.DisplayName,
        DisplayName: item.DisplayName,
        OEE: item.OEE,
        Quality: item.Quality,
        Performance: item.Performance,
        Availability: item.Availability,
        TotalParts: item.TotalParts,
        GoodParts: item.GoodParts,
        RejectParts: item.RejectParts,
        PartsDailyGoal: item.PartsDailyGoal,
        PartsHourlyGoal: item.PartsHourlyGoal,
        ShiftStart: item.ShiftStart,
        DownTime: item.DownTime,
        ParentMachineId: item.ParentMachineId,
        ParentMachineName: item.ParentMachineName,
        MachineType: item.MachineType,
        HasIssues: item.HasIssues,
        ...item,
      }))
      .filter((item: any) => {
        const machineType = item.MachineType?.Name;
        // Include DiscreteLine (lines containing machines) and StandardOEE (standalone machines)
        // Exclude Plant (top-level container)
        return item.MachineId && (machineType === 'DiscreteLine' || machineType === 'StandardOEE');
      });

    return machineData;
  } catch (error: any) {
    if (__DEV__) console.debug('❌ Machine inventory error:', error.message);
    if (error.response) {
      if (__DEV__) console.debug('Response status:', error.response.status);
      if (__DEV__) console.debug('Response data:', error.response.data);
    }
    throw new Error(
      error?.response?.data?.Message || error?.message || 'Failed to fetch machine inventory'
    );
  }
}

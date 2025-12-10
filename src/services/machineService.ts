/**
 * Machine Service
 * Fetches machine details from the admin API
 */

import { authApiClient } from './apiClient';

export interface Machine {
  Id: number;
  Name: string;
  DisplayName: string;
  Description: string;
  IsEnabled: boolean;
  MachineType: {
    Id: number;
    Name: string;
    DisplayName: string;
  };
  ParentMachineIds: number[];
  ShiftScheduleId: number | null;
  TimeZone: string | null;
}

export interface MachinesResponse {
  Ascending: boolean;
  OrderBy: string;
  TotalItems: number;
  PageSize: number;
  CurrentPage: number;
  TotalPages: number;
  Items: Machine[];
}

/**
 * Fetch all machines for a client
 * @param clientId - The client ID
 * @returns Promise resolving to machines response
 */
export async function getMachines(clientId: number): Promise<MachinesResponse> {
  console.log('🔧 Fetching machines for client:', clientId);

  try {
    const response = await authApiClient.get<MachinesResponse>(
      `/admin/clients/${clientId}/machines`,
      {
        params: {
          orderBy: 'DisplayName',
        },
      }
    );

    console.log('✅ Machines fetched:', response.data.TotalItems, 'total items');
    return response.data;
  } catch (error: any) {
    console.error('❌ Machines fetch error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    throw new Error(error?.response?.data?.Message || error?.message || 'Failed to fetch machines');
  }
}

/**
 * Create a map of machine IDs to display names
 * @param clientId - The client ID
 * @returns Promise resolving to Map of machine ID -> display name
 */
export async function getMachineNameMap(clientId: number): Promise<Map<number, string>> {
  const response = await getMachines(clientId);
  const nameMap = new Map<number, string>();

  response.Items.forEach((machine) => {
    nameMap.set(machine.Id, machine.DisplayName || machine.Name);
  });

  return nameMap;
}

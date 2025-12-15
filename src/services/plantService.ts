/**
 * Plant Service
 * Fetches plant/area list for a client
 */

import { authApiClient } from './apiClient';

export interface Plant {
  Id: number;
  Name: string;
  DisplayName: string;
  ClientId: number;
  ChildMachinesCount: number;
  MachineType: {
    Id: number;
    Name: string;
    DisplayName: string;
  };
}

interface PlantListResponse {
  Items: Plant[];
  TotalItems: number;
}

/**
 * Fetch all plants/areas for a client
 * @param clientId - The client ID to fetch plants for
 */
export async function getPlants(clientId: number): Promise<Plant[]> {
  try {
    if (__DEV__) {
      console.debug('🏭 Fetching plants for client ID:', clientId);
      console.debug('🏭 API Base URL:', authApiClient.defaults.baseURL);
      console.debug(
        '🏭 Full URL:',
        `${authApiClient.defaults.baseURL}/clients/${clientId}/machines?mode=plant`
      );
    }

    const response = await authApiClient.get<PlantListResponse>(`/clients/${clientId}/machines`, {
      params: {
        mode: 'plant',
      },
      timeout: 10000,
    });

    if (__DEV__) {
      console.debug('🏭 Raw response:', JSON.stringify(response.data, null, 2));
    }
    const plants = response.data.Items || [];
    if (__DEV__) {
      console.debug(`✅ Loaded ${plants.length} plants for client ${clientId}`);
      plants.forEach((p: Plant) =>
        console.debug(
          `  - [${p.Id}] ${p.DisplayName} (${p.ChildMachinesCount} machines) - ClientId: ${p.ClientId}, MachineType.Name: ${p.MachineType.Name}`
        )
      );
    }

    // Filter to only show items where MachineType.Name === "Plant"
    const filteredPlants = plants.filter((p) => p.MachineType.Name === 'Plant');
    if (__DEV__) {
      console.debug(`📋 Filtered to ${filteredPlants.length} plants (MachineType.Name === "Plant")`);
    }

    return filteredPlants;
  } catch (error: any) {
    if (__DEV__) console.debug('❌ Failed to fetch plants:', error);
    if (__DEV__) console.debug('❌ Error details:', {
      message: error?.message,
      response: error?.response?.data,
      status: error?.response?.status,
      url: error?.config?.url,
    });
    // Return empty array instead of throwing to prevent UI hang
    return [];
  }
}

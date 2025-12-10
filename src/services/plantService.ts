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
    console.log('🏭 Fetching plants for client ID:', clientId);
    console.log('🏭 API Base URL:', authApiClient.defaults.baseURL);
    console.log(
      '🏭 Full URL:',
      `${authApiClient.defaults.baseURL}/clients/${clientId}/machines?mode=plant`
    );

    const response = await authApiClient.get<PlantListResponse>(`/clients/${clientId}/machines`, {
      params: {
        mode: 'plant',
      },
      timeout: 10000,
    });

    console.log('🏭 Raw response:', JSON.stringify(response.data, null, 2));
    const plants = response.data.Items || [];
    console.log(`✅ Loaded ${plants.length} plants for client ${clientId}`);
    plants.forEach((p: Plant) =>
      console.log(
        `  - [${p.Id}] ${p.DisplayName} (${p.ChildMachinesCount} machines) - ClientId: ${p.ClientId}, MachineType.Name: ${p.MachineType.Name}`
      )
    );

    // Filter to only show items where MachineType.Name === "Plant"
    const filteredPlants = plants.filter((p) => p.MachineType.Name === 'Plant');
    console.log(`📋 Filtered to ${filteredPlants.length} plants (MachineType.Name === "Plant")`);

    return filteredPlants;
  } catch (error: any) {
    console.error('❌ Failed to fetch plants:', error);
    console.error('❌ Error details:', {
      message: error?.message,
      response: error?.response?.data,
      status: error?.response?.status,
      url: error?.config?.url,
    });
    // Return empty array instead of throwing to prevent UI hang
    return [];
  }
}

/**
 * Tag Type Service
 * Fetches tag type options (like current product) from the API
 */

import { authApiClient } from './apiClient';

/**
 * Tag type option response item
 */
export interface TagTypeOption {
  Id: number;
  Name: string;
  Description?: string | null;
  // Add other fields as needed based on actual API response
}

/**
 * Parameters for fetching tag type options
 */
export interface TagTypeOptionsParams {
  tagTypeId: number;
  machineId: number;
  filter?: string;
  start: string; // ISO date string
  end: string; // ISO date string
  dateType?: 'calendar' | 'shift';
}

/**
 * Fetch tag type options (e.g., current product running on machine)
 * @param params Tag type options parameters
 * @returns Promise resolving to array of tag type options
 */
export async function getTagTypeOptions(params: TagTypeOptionsParams): Promise<TagTypeOption[]> {
  const { tagTypeId, machineId, filter, start, end, dateType = 'calendar' } = params;

  const queryParams = new URLSearchParams();
  queryParams.append('machineId', machineId.toString());
  queryParams.append('start', start);
  queryParams.append('end', end);
  queryParams.append('dateType', dateType);

  if (filter) {
    queryParams.append('filter', filter);
  }

  const endpoint = `/tagtypes/${tagTypeId}/options?${queryParams.toString()}`;
  if (__DEV__) console.debug('🏷️ Fetching tag type options:', endpoint);
  if (__DEV__) console.debug('🏷️ Full URL:', authApiClient.defaults.baseURL + endpoint);
  if (__DEV__) console.debug('🏷️ Query params:', params);

  try {
    const response = await authApiClient.get<TagTypeOption[]>(endpoint);
    if (__DEV__) console.debug('✅ Tag type options response status:', response.status);
    if (__DEV__) console.debug('✅ Tag type options response data:', JSON.stringify(response.data, null, 2));
    if (__DEV__) console.debug(
      '✅ Tag type options count:',
      Array.isArray(response.data) ? response.data.length : 'not an array'
    );
    return response.data;
  } catch (error: any) {
    if (__DEV__) console.debug('❌ Tag type options error:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
    });
    throw error;
  }
}

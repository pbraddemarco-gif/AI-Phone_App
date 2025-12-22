import { authApiClient } from './apiClient';
import { safeLog } from '../utils/logger';

export interface MachineUser {
  Id: number;
  Name?: string;
  DisplayName?: string;
  Username?: string;
  Email?: string;
}

/**
 * Fetch users associated with a specific machine
 * Uses app.automationintellect base via authApiClient
 */
export async function getUsersForMachine(machineId: number): Promise<MachineUser[]> {
  try {
    const url = `/machines/${machineId}/users`;
    safeLog('debug', 'MachineUserService: GET', { url });
    const response = await authApiClient.get<any>(url);
    const data = response.data;

    // Try common response shapes
    const items: any[] = Array.isArray(data)
      ? data
      : Array.isArray(data?.Items)
        ? data.Items
        : Array.isArray(data?.users)
          ? data.users
          : Array.isArray(data?.Data)
            ? data.Data
            : [];

    const mapped = (items || []).map((u: any) => ({
      Id: u.Id ?? u.UserId ?? u.id,
      Name: u.Name ?? u.DisplayName ?? u.Username ?? u.name,
      DisplayName: u.DisplayName ?? u.Name,
      Username: u.Username ?? u.UserName ?? u.username,
      Email: u.Email ?? u.email,
    }));
    safeLog('debug', 'MachineUserService: users parsed', { count: mapped.length });
    return mapped;
  } catch (error: any) {
    safeLog('error', 'MachineUserService: error', { message: error?.message });
    throw new Error(error?.response?.data?.Message || error?.message || 'Failed to fetch users');
  }
}

import { authApiClient } from './apiClient';
import { getCurrentUsername, getDevToken } from './tokenStorage';
import axios from 'axios';

const DEV_API_BASE_URL = 'https://dev1.automationintellect.com/api';

export interface ActionPayload {
  TypeId: number;
  Name: string;
  Details: string;
  Description?: string;
  CategoryId: number;
  AssigneeId?: number;
  StatusId?: number;
  IsActive: boolean;
  DueDate?: string;
  ShiftId?: number;
  ThingIds: number[];
  UserIds: number[];
  LabelIds: number[];
  MediaIds: number[];
  UserId?: number;
  CreatedDate?: string;
  Priority?: string | null;
  MinutesLost?: number | null;
  HasEmailNotifications?: boolean;
  CustomData1?: string;
  CustomData2?: string;
  CustomData3?: string;
  CustomData4?: string;
  CustomData5?: string;
  CustomData6?: string;
  CustomData7?: string;
  CustomData8?: string;
  CustomData9?: string;
  CustomData10?: string;
}

export interface ActionStatus {
  Id: number;
  Name: string;
  DisplayName?: string;
  Description?: string | null;
}

export interface ActionLabel {
  Id: number;
  Name: string;
  DisplayName?: string;
  Description?: string | null;
  Color?: string;
}

// Minimal shape for listing existing actions
export interface ActionListItem {
  Id: number;
  Name: string;
  Details?: string;
  Description?: string;
  StatusId?: number;
  StatusName?: string;
  CategoryId?: number;
  CategoryName?: string;
  AssigneeId?: number;
  AssigneeName?: string;
  MachineId?: number;
  MachineName?: string;
  CreatedDate?: string;
  DueDate?: string;
  LabelIds?: number[];
  Labels?: ActionLabel[];
  Priority?: string | null;
  Type?: {
    Id: number;
    Name: string;
    DisplayName: string;
  };
}

export interface ActionListResponse {
  Items: ActionListItem[];
  TotalCount?: number;
}

export interface ActionListFilters {
  from?: string; // ISO string
  to?: string; // ISO string
  page?: number;
  pageSize?: number;
  orderBy?: string;
  ascending?: boolean;
  dateType?: string;
  filter?: string; // raw filter string per API docs (e.g., "Status:Open;IsActive:true")
}

/**
 * Fetch all available action statuses
 * For testuserapp, uses dev server; otherwise uses production server
 */
export async function fetchActionStatuses(): Promise<ActionStatus[]> {
  try {
    const username = await getCurrentUsername();
    const isTestUser = username?.toLowerCase().includes('testuserapp');

    if (isTestUser) {
      const devToken = await getDevToken();
      if (!devToken) {
        throw new Error('Dev token not available for testuserapp');
      }

      const response = await axios.get<ActionStatus[]>(
        `${DEV_API_BASE_URL}/taskdocuments/statuses`,
        {
          headers: {
            Authorization: `Bearer ${devToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data || [];
    } else {
      const response = await authApiClient.get<ActionStatus[]>('/taskdocuments/statuses');
      return response.data || [];
    }
  } catch (error: any) {
    if (__DEV__) {
      console.debug('❌ Failed to fetch action statuses:', error?.message || error);
    }
    throw error;
  }
}

/**
 * Fetch all available action labels for a client
 * For testuserapp, uses dev server; otherwise uses production server
 */
export async function fetchActionLabels(clientId: number): Promise<ActionLabel[]> {
  try {
    const username = await getCurrentUsername();
    const isTestUser = username?.toLowerCase().includes('testuserapp');

    if (isTestUser) {
      const devToken = await getDevToken();
      if (!devToken) {
        throw new Error('Dev token not available for testuserapp');
      }

      const response = await axios.get<ActionLabel[]>(
        `${DEV_API_BASE_URL}/clients/${clientId}/tasklabels`,
        {
          headers: {
            Authorization: `Bearer ${devToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data || [];
    } else {
      const response = await authApiClient.get<ActionLabel[]>(`/clients/${clientId}/tasklabels`);
      return response.data || [];
    }
  } catch (error: any) {
    if (__DEV__) {
      console.debug('❌ Failed to fetch action labels:', error?.message || error);
    }
    throw error;
  }
}

/**
 * Fetch actions with optional filtering
 * For testuserapp, uses dev server; otherwise uses production server
 */
export async function fetchActions(
  machineId: number,
  filters: ActionListFilters = {}
): Promise<ActionListResponse> {
  try {
    const params: Record<string, any> = {
      ...(filters.from && { start: filters.from }),
      ...(filters.to && { end: filters.to }),
      ...(filters.page && { pageNumber: filters.page }),
      ...(filters.pageSize && { pageSize: filters.pageSize }),
      ...(filters.orderBy && { orderBy: filters.orderBy }),
      ...(filters.ascending !== undefined && { ascending: filters.ascending }),
      ...(filters.dateType && { dateType: filters.dateType }),
      ...(filters.filter && { filter: filters.filter }),
    };

    const username = await getCurrentUsername();
    const isTestUser = username?.toLowerCase().includes('testuserapp');

    if (isTestUser) {
      const devToken = await getDevToken();
      if (!devToken) {
        throw new Error('Dev token not available for testuserapp');
      }

      const response = await axios.get<ActionListResponse>(
        `${DEV_API_BASE_URL}/machines/${machineId}/taskdocuments`,
        {
          params,
          headers: {
            Authorization: `Bearer ${devToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data || { Items: [], TotalCount: 0 };
    } else {
      const response = await authApiClient.get<ActionListResponse>(
        `/machines/${machineId}/taskdocuments`,
        {
          params,
        }
      );
      return response.data || { Items: [], TotalCount: 0 };
    }
  } catch (error: any) {
    if (__DEV__) {
      console.debug('❌ Failed to fetch actions:', error?.message || error);
    }
    throw error;
  }
}

/**
 * Fetch a single action's full details by ID
 * For testuserapp, uses dev server; otherwise uses production server
 */
export async function fetchActionDetails(actionId: number): Promise<ActionPayload | null> {
  try {
    const username = await getCurrentUsername();
    const isTestUser = username?.toLowerCase().includes('testuserapp');

    if (isTestUser) {
      const devToken = await getDevToken();
      if (!devToken) {
        throw new Error('Dev token not available for testuserapp');
      }

      const response = await axios.get<ActionPayload>(
        `${DEV_API_BASE_URL}/taskdocuments/${actionId}`,
        {
          headers: {
            Authorization: `Bearer ${devToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data || null;
    } else {
      const response = await authApiClient.get<ActionPayload>(`/taskdocuments/${actionId}`);
      return response.data || null;
    }
  } catch (error: any) {
    if (__DEV__) {
      console.debug('❌ Failed to fetch action details:', error?.message || error);
    }
    throw error;
  }
}

/**
 * Save new action
 * For testuserapp, uses dev server; otherwise uses production server
 */
export async function saveAction(machineId: number, payload: ActionPayload): Promise<any> {
  try {
    const username = await getCurrentUsername();
    const isTestUser = username?.toLowerCase().includes('testuserapp');

    if (isTestUser) {
      const devToken = await getDevToken();
      if (!devToken) {
        throw new Error('Dev token not available for testuserapp');
      }

      if (__DEV__) {
        console.debug('📤 Saving action to dev server:', {
          endpoint: `${DEV_API_BASE_URL}/machines/${machineId}/taskdocuments`,
          payload,
        });
      }

      const response = await axios.post(
        `${DEV_API_BASE_URL}/machines/${machineId}/taskdocuments`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${devToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (__DEV__) {
        console.debug('✅ Action saved successfully to dev server:', response.data);
      }

      return response;
    } else {
      if (__DEV__) {
        console.debug('📤 Saving action to production server:', {
          endpoint: `/machines/${machineId}/taskdocuments`,
          payload,
        });
      }

      const response = await authApiClient.post(`/machines/${machineId}/taskdocuments`, payload);

      if (__DEV__) {
        console.debug('✅ Action saved successfully to production server:', response.data);
      }

      return response;
    }
  } catch (error: any) {
    if (__DEV__) {
      console.debug('❌ Failed to save action:', error?.message || error);
    }
    throw error;
  }
}

/**
 * Update existing action
 * For testuserapp, uses dev server; otherwise uses production server
 */
export async function updateAction(actionId: number, payload: ActionPayload): Promise<any> {
  try {
    const username = await getCurrentUsername();
    const isTestUser = username?.toLowerCase().includes('testuserapp');

    if (isTestUser) {
      const devToken = await getDevToken();
      if (!devToken) {
        throw new Error('Dev token not available for testuserapp');
      }

      if (__DEV__) {
        console.debug('📤 Updating action on dev server:', {
          endpoint: `${DEV_API_BASE_URL}/taskdocuments/${actionId}`,
          payload,
        });
      }

      const response = await axios.put(`${DEV_API_BASE_URL}/taskdocuments/${actionId}`, payload, {
        headers: {
          Authorization: `Bearer ${devToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (__DEV__) {
        console.debug('✅ Action updated successfully on dev server:', response.data);
      }

      return response;
    } else {
      if (__DEV__) {
        console.debug('📤 Updating action on production server:', {
          endpoint: `/taskdocuments/${actionId}`,
          payload,
        });
      }

      const response = await authApiClient.put(`/taskdocuments/${actionId}`, payload);

      if (__DEV__) {
        console.debug('✅ Action updated successfully on production server:', response.data);
      }

      return response;
    }
  } catch (error: any) {
    if (__DEV__) {
      console.debug('❌ Failed to update action:', error?.message || error);
    }
    throw error;
  }
}

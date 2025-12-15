import { authService } from './authService';
import { apiClient, authApiClient } from './apiClient';
import {
  MachineStatus,
  MachinePerformance,
  ProductionHistoryParams,
  ProductionHistoryResponse,
  ShiftConfig,
  ShiftSchedule,
  NotificationStats,
  Notification,
} from '../types/api';

const API_BASE_URL = 'https://lowcost-env.upd2vnf6k6.us-west-2.elasticbeanstalk.com/api';

class ProductionService {
  private async getAuthHeaders(): Promise<{ [key: string]: string }> {
    const token = await authService.getAccessToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    return {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    };
  }

  async getMachineStatus(machineIds: string[]): Promise<MachineStatus[]> {
    const params = machineIds.map((id, index) => `ids[${index}]=${id}`).join('&');

    const response = await authApiClient.get<MachineStatus[]>(`/machines/status?${params}`);

    return response.data;
  }

  async getMachinePerformance(
    machineId: string,
    params: {
      start: string;
      end: string;
      dateType?: string;
      intervalBase?: string;
      filter?: string;
      dims?: string[];
    }
  ): Promise<MachinePerformance> {
    const headers = await this.getAuthHeaders();

    const queryParams = new URLSearchParams({
      start: params.start,
      end: params.end,
      ...(params.dateType && { dateType: params.dateType }),
      ...(params.intervalBase && { intervalBase: params.intervalBase }),
      ...(params.filter && { filter: params.filter }),
    });

    // Add dims array parameters
    if (params.dims) {
      params.dims.forEach((dim, index) => {
        queryParams.append(`dims[${index}]`, dim);
      });
    }

    const response = await apiClient.get<MachinePerformance>(
      `${API_BASE_URL}/machines/${machineId}/performance?${queryParams.toString()}`,
      { headers }
    );

    return response.data;
  }

  async getProductionHistory(
    machineId: string,
    params: ProductionHistoryParams
  ): Promise<ProductionHistoryResponse> {
    const headers = await this.getAuthHeaders();

    const queryParams = new URLSearchParams({
      start: params.start,
      end: params.end,
      ...(params.dateType && { dateType: params.dateType }),
      ...(params.intervalBase && { intervalBase: params.intervalBase }),
      ...(params.timeBase && { timeBase: params.timeBase }),
      ...(params.groupBy && { groupBy: params.groupBy }),
      ...(params.pageSize && { pageSize: params.pageSize.toString() }),
      ...(params.pageNumber && { pageNumber: params.pageNumber.toString() }),
      ...(params.orderBy && { orderBy: params.orderBy }),
      ...(params.ascending !== undefined && { ascending: params.ascending.toString() }),
      ...(params.filter && { filter: params.filter }),
    });

    // Add modes array
    if (params.modes) {
      params.modes.forEach((mode, index) => {
        queryParams.append(`modes[${index}]`, mode);
      });
    }

    // Add dims array
    if (params.dims) {
      params.dims.forEach((dim, index) => {
        queryParams.append(`dims[${index}]`, dim);
      });
    }

    const response = await apiClient.get<ProductionHistoryResponse>(
      `${API_BASE_URL}/machines/${machineId}/productionhistory?${queryParams.toString()}`,
      { headers }
    );

    return response.data;
  }

  async getMachineShiftSchedules(
    machineId: string,
    mode?: 'current' | 'previous',
    filter?: string
  ): Promise<ShiftConfig> {
    const headers = await this.getAuthHeaders();

    const queryParams = new URLSearchParams({
      ...(mode && { mode }),
      ...(filter && { filter }),
    });

    const response = await apiClient.get<ShiftConfig>(
      `${API_BASE_URL}/machines/${machineId}/shiftschedules?${queryParams.toString()}`,
      { headers }
    );

    return response.data;
  }

  async getMachineShiftScheduleByDate(machineId: string, date: string): Promise<ShiftSchedule> {
    const headers = await this.getAuthHeaders();

    const response = await apiClient.get<ShiftSchedule>(
      `${API_BASE_URL}/machines/${machineId}/shiftschedules/${date}`,
      { headers }
    );

    return response.data;
  }

  async getNotifications(
    accountId: string,
    params: {
      type?: string;
      unreadOnly?: boolean;
      pageSize?: number;
      pageNumber?: number;
      orderBy?: string;
      ascending?: boolean;
      filter?: string;
    }
  ): Promise<Notification[]> {
    const headers = await this.getAuthHeaders();

    const queryParams = new URLSearchParams({
      ...(params.type && { type: params.type }),
      ...(params.unreadOnly !== undefined && { unreadOnly: params.unreadOnly.toString() }),
      ...(params.pageSize && { pageSize: params.pageSize.toString() }),
      ...(params.pageNumber && { pageNumber: params.pageNumber.toString() }),
      ...(params.orderBy && { orderBy: params.orderBy }),
      ...(params.ascending !== undefined && { ascending: params.ascending.toString() }),
      ...(params.filter && { filter: params.filter }),
    });

    const response = await apiClient.get<Notification[]>(
      `${API_BASE_URL}/accounts/${accountId}/notifications?${queryParams.toString()}`,
      { headers }
    );

    return response.data;
  }

  async getNotificationStats(
    accountId: string,
    type?: string,
    filter?: string
  ): Promise<NotificationStats> {
    const headers = await this.getAuthHeaders();

    const queryParams = new URLSearchParams({
      ...(type && { type }),
      ...(filter && { filter }),
    });

    const response = await apiClient.get<NotificationStats>(
      `${API_BASE_URL}/accounts/${accountId}/notificationstats?${queryParams.toString()}`,
      { headers }
    );

    return response.data;
  }
}

export const productionService = new ProductionService();

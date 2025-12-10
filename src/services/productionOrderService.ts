/**
 * Production Orders Service
 * Fetches production orders for a client
 */

import { authApiClient } from './apiClient';
import { ProductionOrdersResponse } from '../types/productionOrder';

interface GetProductionOrdersParams {
  clientId: number;
  startDate: string; // ISO format: 2025-11-26T00:00:00
  endDate: string; // ISO format: 2025-11-30T23:59:59
  orderBy?: string;
  ascending?: boolean;
  pageSize?: number;
  pageNumber?: number;
}

/**
 * Fetch production orders for a client
 */
export async function getProductionOrders(
  params: GetProductionOrdersParams
): Promise<ProductionOrdersResponse> {
  const {
    clientId,
    startDate,
    endDate,
    orderBy = 'Id',
    ascending = false,
    pageSize = 10,
    pageNumber = 1,
  } = params;

  console.log('📋 Fetching production orders for client:', clientId);
  console.log('📅 Date range:', startDate, 'to', endDate);

  try {
    const response = await authApiClient.get<ProductionOrdersResponse>(
      `/admin/clients/${clientId}/productionorders`,
      {
        params: {
          orderBy,
          ascending,
          pageSize,
          pageNumber,
          start: startDate,
          end: endDate,
        },
      }
    );

    console.log('✅ Production orders fetched:', response.data.TotalItems, 'total items');
    return response.data;
  } catch (error: any) {
    console.error('❌ Production orders error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    throw new Error(
      error?.response?.data?.Message || error?.message || 'Failed to fetch production orders'
    );
  }
}

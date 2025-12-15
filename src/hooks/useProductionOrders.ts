/**
 * Production Orders Hook
 * Fetches and manages production orders for a client
 */

import { useState, useEffect } from 'react';
import { getProductionOrders } from '../services/productionOrderService';
import { ProductionOrder } from '../types/productionOrder';

interface UseProductionOrdersParams {
  clientId: number | null;
  startDate: string;
  endDate: string;
  enabled?: boolean;
}

export function useProductionOrders(params: UseProductionOrdersParams) {
  const { clientId, startDate, endDate, enabled = true } = params;
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  const fetchOrders = async (page: number = 1) => {
    if (!clientId || !enabled) {
      if (__DEV__) console.debug('⏭️ Skipping production orders fetch - clientId:', clientId, 'enabled:', enabled);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await getProductionOrders({
        clientId,
        startDate,
        endDate,
        pageNumber: page,
        pageSize: 1000, // Fetch all orders
      });

      setOrders(response.Items);
      setTotalItems(response.TotalItems);
      setCurrentPage(response.CurrentPage);
      setTotalPages(response.TotalPages);
    } catch (err: any) {
      if (__DEV__) console.debug('Failed to fetch production orders:', err);
      setError(err.message || 'Failed to load production orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(1);
  }, [clientId, startDate, endDate, enabled]);

  const refetch = () => fetchOrders(currentPage);
  const loadPage = (page: number) => fetchOrders(page);

  return {
    orders,
    loading,
    error,
    refetch,
    totalItems,
    currentPage,
    totalPages,
    loadPage,
  };
}

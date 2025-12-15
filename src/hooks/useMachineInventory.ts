/**
 * Hook to fetch machine inventory list
 */

import { useState, useEffect } from 'react';
import { getMachineInventory, MachineInventoryItem } from '../services/machineInventoryService';
import { CustomerAccount } from '../types/auth';

interface UseMachineInventoryResult {
  machines: MachineInventoryItem[];
  loading: boolean;
  error: string | null;
  refetch: (force?: boolean) => Promise<void>;
}

/**
 * Hook to fetch list of all machines
 * @param customer - Customer account with ID and optional MachineId
 * @param shiftType - 'current' for current shift or 'last' for last shift
 */
export function useMachineInventory(
  customer?: CustomerAccount | null,
  shiftType: 'current' | 'last' = 'current'
): UseMachineInventoryResult {
  const [machines, setMachines] = useState<MachineInventoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchedCustomerId, setLastFetchedCustomerId] = useState<number | null>(null);
  const [lastFetchedShiftType, setLastFetchedShiftType] = useState<'current' | 'last'>('current');

  const fetchData = async (force: boolean = false) => {
    if (__DEV__) console.debug('🔄 useMachineInventory: fetchData called with customer:', customer);

    // Don't fetch if we don't have a customer yet or ID is 0 (placeholder)
    if (!customer || !customer.Id || customer.Id === 0) {
      if (__DEV__) console.debug('⏸️ Skipping fetch - waiting for valid customer');
      setMachines([]); // Clear machines
      setLoading(false);
      return;
    }

    // Avoid duplicate fetches only if we already have data for this customer and shift
    if (
      !force &&
      lastFetchedCustomerId === customer.Id &&
      lastFetchedShiftType === shiftType &&
      machines.length > 0
    ) {
      if (__DEV__) console.debug(
        '⏸️ Skipping fetch - already have machines for customer:',
        customer.Id,
        'shift:',
        shiftType
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (__DEV__) console.debug(
        '🏭 Fetching machines for plant ID:',
        customer.Id,
        '(' + customer.DisplayName + ')',
        'shift:',
        shiftType
      );

      const result = await getMachineInventory(customer.Id, shiftType);
      if (__DEV__) console.debug(
        '🏭 Machine inventory loaded:',
        result.length,
        'machines for plant:',
        customer.Id,
        '(' + customer.DisplayName + ')'
      );
      setMachines(result);
      setLastFetchedCustomerId(customer.Id);
      setLastFetchedShiftType(shiftType);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch machine inventory';
      setError(errorMessage);
      if (__DEV__) console.debug('❌ Machine inventory fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (__DEV__) console.debug(
      '🎯 useMachineInventory: useEffect triggered, customer ID:',
      customer?.Id,
      'Name:',
      customer?.Name,
      'shift:',
      shiftType
    );
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer?.Id, shiftType]); // Re-fetch when customer ID or shift type changes

  return {
    machines,
    loading,
    error,
    refetch: fetchData,
  };
}

/**
 * Customer Selection Storage
 * Manages the currently selected customer/plant
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { CustomerAccount } from '../types/auth';

const SELECTED_CUSTOMER_KEY = '@selected_customer';

/**
 * Save selected customer to storage
 */
export async function saveSelectedCustomer(customer: CustomerAccount): Promise<void> {
  await AsyncStorage.setItem(SELECTED_CUSTOMER_KEY, JSON.stringify(customer));
}

/**
 * Get selected customer from storage
 */
export async function getSelectedCustomer(): Promise<CustomerAccount | null> {
  try {
    const json = await AsyncStorage.getItem(SELECTED_CUSTOMER_KEY);
    if (!json) return null;
    return JSON.parse(json);
  } catch (error) {
    console.error('Failed to get selected customer:', error);
    return null;
  }
}

/**
 * Clear selected customer
 */
export async function clearSelectedCustomer(): Promise<void> {
  await AsyncStorage.removeItem(SELECTED_CUSTOMER_KEY);
}

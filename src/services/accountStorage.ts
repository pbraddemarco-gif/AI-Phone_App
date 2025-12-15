/**
 * Account Storage Service
 * Stores customer accounts from login response
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { CustomerAccount } from '../types/auth';

const CUSTOMER_ACCOUNTS_KEY = '@customer_accounts';

/**
 * Save customer accounts from login response
 */
export async function saveCustomerAccounts(accounts: CustomerAccount[]): Promise<void> {
  try {
    await AsyncStorage.setItem(CUSTOMER_ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch (error) {
    if (__DEV__) console.debug('Failed to save customer accounts:', error);
  }
}

/**
 * Get stored customer accounts
 */
export async function getCustomerAccounts(): Promise<CustomerAccount[]> {
  try {
    const data = await AsyncStorage.getItem(CUSTOMER_ACCOUNTS_KEY);
    if (!data) {
      return [];
    }
    const parsed = JSON.parse(data);
    if (__DEV__) {
      console.debug('✅ Loaded customer accounts:', parsed);
    }
    return parsed;
  } catch (error) {
    if (__DEV__) console.debug('Failed to load customer accounts:', error);
    return [];
  }
}

/**
 * Clear stored customer accounts (on logout)
 */
export async function clearCustomerAccounts(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CUSTOMER_ACCOUNTS_KEY);
  } catch (error) {
    if (__DEV__) console.debug('Failed to clear customer accounts:', error);
  }
}

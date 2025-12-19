/**
 * Secure token storage using Expo SecureStore
 * Provides encrypted storage for authentication tokens on device
 */

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'auth_access_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';
const USERNAME_KEY = 'auth_username';
const DEV_TOKEN_KEY = 'auth_dev_token';

/**
 * Save username to secure storage
 */
export async function saveUsername(username: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem(USERNAME_KEY, username);
    } else {
      await SecureStore.setItemAsync(USERNAME_KEY, username);
    }
  } catch (error) {
    if (__DEV__) console.debug('Failed to save username:', error);
  }
}

/**
 * Get stored username
 */
export async function getCurrentUsername(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      return localStorage.getItem(USERNAME_KEY);
    }
    return await SecureStore.getItemAsync(USERNAME_KEY);
  } catch (error) {
    if (__DEV__) console.debug('Failed to retrieve username:', error);
    return null;
  }
}

/**
 * Save access token to secure storage
 */
export async function saveToken(token: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      // Web fallback: use localStorage
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    }
  } catch (error) {
    if (__DEV__) console.debug('Failed to save token:', error);
    throw new Error('Could not save authentication token');
  }
}

/**
 * Save refresh token to secure storage
 */
export async function saveRefreshToken(token: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem(REFRESH_TOKEN_KEY, token);
    } else {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
    }
  } catch (error) {
    if (__DEV__) console.debug('Failed to save refresh token:', error);
  }
}

/**
 * Retrieve access token from secure storage
 */
export async function getToken(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      return localStorage.getItem(TOKEN_KEY);
    } else {
      return await SecureStore.getItemAsync(TOKEN_KEY);
    }
  } catch (error) {
    if (__DEV__) console.debug('Failed to retrieve token:', error);
    return null;
  }
}

/**
 * Retrieve refresh token from secure storage
 */
export async function getRefreshToken(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      return localStorage.getItem(REFRESH_TOKEN_KEY);
    } else {
      return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    }
  } catch (error) {
    if (__DEV__) console.debug('Failed to retrieve refresh token:', error);
    return null;
  }
}

/**
 * Save dev token to secure storage (for testuserapp writing to dev server)
 */
export async function saveDevToken(token: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem(DEV_TOKEN_KEY, token);
    } else {
      await SecureStore.setItemAsync(DEV_TOKEN_KEY, token);
    }
  } catch (error) {
    if (__DEV__) console.debug('Failed to save dev token:', error);
  }
}

/**
 * Retrieve dev token from secure storage
 */
export async function getDevToken(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      return localStorage.getItem(DEV_TOKEN_KEY);
    } else {
      return await SecureStore.getItemAsync(DEV_TOKEN_KEY);
    }
  } catch (error) {
    if (__DEV__) console.debug('Failed to retrieve dev token:', error);
    return null;
  }
}

/**
 * Clear all authentication tokens from secure storage
 */
export async function clearToken(): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(USERNAME_KEY);
      localStorage.removeItem(DEV_TOKEN_KEY);
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      await SecureStore.deleteItemAsync(USERNAME_KEY);
      await SecureStore.deleteItemAsync(DEV_TOKEN_KEY);
    }
  } catch (error) {
    if (__DEV__) console.debug('Failed to clear tokens:', error);
  }
}

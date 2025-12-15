/**
 * Authentication Service
 * Handles OAuth password grant login with form-urlencoded requests
 */

import axios, { AxiosError } from 'axios';
import { authApiClient } from './apiClient';
import { saveToken, saveRefreshToken, getToken, clearToken } from './tokenStorage';
import type { AuthTokenResponse, LoginCredentials, AuthError } from '../types/auth';
import { extractCustomerAccounts } from './tokenParser';
import {
  saveCustomerAccounts,
  getCustomerAccounts as loadCustomerAccounts,
  clearCustomerAccounts,
} from './accountStorage';
import { isValidUsername, isValidPassword } from '../utils/validation';
import { safeLog } from '../utils/logger';

const AUTH_ENDPOINT = '/accounts/token';
const CLIENT_ID = 'B9C5132D-83A9-40FF-8B06-A00C53322E01';

class AuthService {
  private listeners: Array<() => void> = [];

  addAuthListener(listener: () => void) {
    this.listeners.push(listener);
  }

  removeAuthListener(listener: () => void) {
    this.listeners = this.listeners.filter((l) => l !== listener);
  }

  private notifyAuthChanged() {
    for (const l of this.listeners) {
      try {
        l();
      } catch (e) {
        console.warn('Auth listener error', e);
      }
    }
  }
  /**
   * Login with username and password using OAuth password grant
   * Sends application/x-www-form-urlencoded request
   */
  async login(username: string, password: string): Promise<AuthTokenResponse> {
    // Input validation
    if (!username || typeof username !== 'string') {
      throw new Error('Username is required');
    }
    if (!password || typeof password !== 'string') {
      throw new Error('Password is required');
    }

    // Basic length checks (don't validate format too strictly for compatibility)
    if (username.length < 3 || username.length > 100) {
      throw new Error('Invalid username format');
    }

    const passwordValidation = isValidPassword(password);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.message || 'Invalid password');
    }

    const formData = new URLSearchParams();
    formData.append('grant_type', 'password');
    formData.append('username', username.trim());
    formData.append('password', password);
    formData.append('client_id', CLIENT_ID);

    try {
      const response = await authApiClient.post<AuthTokenResponse>(
        AUTH_ENDPOINT,
        formData.toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          // Axios will handle CORS when hitting proxy on web; upstream direct on native.
        }
      );

      const data = response.data;

      let accountData = null;

      if (data.account) {
        let parsedAccount = data.account;
        if (typeof data.account === 'string') {
          try {
            parsedAccount = JSON.parse(data.account);
          } catch (e) {
            console.error('❌ Failed to parse account string:', e);
            parsedAccount = null;
          }
        }

        if (parsedAccount) {
          if (Array.isArray(parsedAccount)) {
            accountData = parsedAccount;
          } else if (typeof parsedAccount === 'object') {
            const keys = Object.keys(parsedAccount);
            if (keys.length > 0 && keys.every((k) => !isNaN(Number(k)))) {
              accountData = Object.values(parsedAccount);
            } else if (parsedAccount.Clients) {
              accountData = parsedAccount.Clients;
            }
          }
        }
      }

      if (accountData && accountData.length > 0) {
        const customerAccounts = accountData.map((client: any) => ({
          Id: client.Id || client.id || 0,
          Name: client.Name || client.name || 'Unknown',
          DisplayName: client.DisplayName || client.displayName || client.Name || 'Unknown',
          ParentId: client.ParentId || client.parentId,
          MachineId: client.MachineId || client.machineId,
          ...client,
        }));

        await saveCustomerAccounts(customerAccounts);
      }

      const { access_token, refresh_token } = data;

      // Security: Log only metadata, never token values
      if (__DEV__) {
        console.log('🔍 AuthService: Login response received', {
          hasAccessToken: !!access_token,
          accessTokenLength: access_token?.length || 0,
          isJWT: access_token ? access_token.split('.').length === 3 : false,
          hasRefreshToken: !!refresh_token,
        });
      }

      await saveToken(access_token);

      if (refresh_token) {
        await saveRefreshToken(refresh_token);
      }

      this.notifyAuthChanged();
      return data;
    } catch (err) {
      safeLog('error', 'Login failed', { error: err instanceof Error ? err.message : 'Unknown' });

      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const payload: any = err.response?.data;

        // Don't log full error payload in production (may contain sensitive info)
        if (__DEV__) {
          console.error('Status:', status);
          console.error('Payload:', payload);
        }

        // Provide user-friendly error messages without leaking details
        let message = 'Login failed. Please check your credentials.';

        if (status === 401 || status === 403) {
          message = 'Invalid username or password';
        } else if (status === 429) {
          message = 'Too many login attempts. Please try again later.';
        } else if (status && status >= 500) {
          message = 'Server error. Please try again later.';
        } else if (!status) {
          message = 'Network error. Please check your connection.';
        }

        // In development, allow server error messages through
        if (__DEV__ && (payload?.error_description || payload?.error)) {
          message = payload.error_description || payload.error || message;
        }

        throw new Error(message);
      }
      if (err instanceof Error) throw err;
      throw new Error('Network error. Please check your connection.');
    }
  }

  /**
   * Get current access token from storage
   */
  async getAccessToken(): Promise<string | null> {
    return await getToken();
  }

  /**
   * Get customer accounts from stored token
   * Note: Customer accounts are stored in the token response, not in the JWT itself
   */
  async getCustomerAccounts() {
    // Load from AsyncStorage where we saved them during login
    return await loadCustomerAccounts();
  }

  /**
   * Check if user is authenticated (has valid token)
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await getToken();
    return token !== null;
  }

  /**
   * Logout user and clear all tokens
   */
  async logout(): Promise<void> {
    await clearToken();
    await clearCustomerAccounts();
    this.notifyAuthChanged();
  }
}

export const authService = new AuthService();

/**
 * Authentication Service
 * Handles OAuth password grant login with form-urlencoded requests
 */

import axios, { AxiosError } from 'axios';
import { authApiClient } from './apiClient';
import { saveToken, saveRefreshToken, getToken, clearToken } from './tokenStorage';
import type { AuthTokenResponse, LoginCredentials, AuthError } from '../types/auth';

const AUTH_ENDPOINT = '/accounts/token';
const CLIENT_ID = 'B9C5132D-83A9-40FF-8B06-A00C53322E01';

class AuthService {
  /**
   * Login with username and password using OAuth password grant
   * Sends application/x-www-form-urlencoded request
   */
  async login(username: string, password: string): Promise<AuthTokenResponse> {
    try {
      // Create form-urlencoded body
      const formData = new URLSearchParams();
      formData.append('grant_type', 'password');
      formData.append('username', username);
      formData.append('password', password);
      formData.append('client_id', CLIENT_ID);

      const response = await authApiClient.post<AuthTokenResponse>(
        AUTH_ENDPOINT,
        formData.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const { access_token, refresh_token } = response.data;

      // Save tokens securely
      await saveToken(access_token);
      if (refresh_token) {
        await saveRefreshToken(refresh_token);
      }

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<AuthError>;
        const errorMessage =
          axiosError.response?.data?.error_description ||
          axiosError.response?.data?.error ||
          'Authentication failed';
        throw new Error(errorMessage);
      }
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
  }
}

export const authService = new AuthService();

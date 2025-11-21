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
      console.log('🔐 Login attempt starting...');
      console.log('Username:', username);

      const AUTH_URL = 'https://app.automationintellect.com/api/accounts/token';
      console.log('API Endpoint:', AUTH_URL);
      console.log('Client ID:', CLIENT_ID);

      // Create form-urlencoded body
      const formData = new URLSearchParams();
      formData.append('grant_type', 'password');
      formData.append('username', username);
      formData.append('password', password);
      formData.append('client_id', CLIENT_ID);

      console.log(
        '📤 Form data being sent:',
        formData.toString().replace(/password=[^&]*/, 'password=***')
      );
      console.log('📤 Sending login request using fetch API to bypass CORS preflight...');

      // Use fetch API with mode: 'cors' to attempt CORS request
      const response = await fetch(AUTH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
        mode: 'cors', // Allow CORS
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Response data:', errorData);
        throw new Error(
          errorData.error_description || errorData.error || `Login failed (${response.status})`
        );
      }

      const data: AuthTokenResponse = await response.json();
      console.log('✅ Login successful!');
      console.log('Token received:', data.access_token.substring(0, 20) + '...');

      const { access_token, refresh_token } = data;

      // Save tokens securely
      await saveToken(access_token);
      console.log('💾 Token saved to secure storage');

      if (refresh_token) {
        await saveRefreshToken(refresh_token);
        console.log('💾 Refresh token saved');
      }

      return data;
    } catch (error) {
      console.error('❌ Login failed!');
      console.error('Error details:', error);

      if (error instanceof Error) {
        throw error;
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

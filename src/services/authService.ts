import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const AUTH_BASE_URL = 'https://dev1.automationintellect.com/api/accounts';
const TOKEN_KEY = '@aiq_access_token';
const REFRESH_TOKEN_KEY = '@aiq_refresh_token';
const USER_KEY = '@aiq_user';
const CREDENTIALS_KEY = '@aiq_credentials';

interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  account: {
    id: string;
    username: string;
    email: string;
    [key: string]: any;
  };
  client_id: string;
  '.issued': string;
  '.expires': string;
}

interface StoredCredentials {
  username: string;
  password: string;
  client_id: string;
}

class AuthService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  async login(username: string, password: string, clientId: string = 'mobile-app'): Promise<void> {
    try {
      const formData = new URLSearchParams();
      formData.append('grant_type', 'password');
      formData.append('username', username);
      formData.append('password', password);
      formData.append('client_id', clientId);
      formData.append('remember_me', 'true');

      const response = await axios.post<AuthResponse>(`${AUTH_BASE_URL}/token`, formData.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
      });

      const { access_token, refresh_token, account } = response.data;

      // Store tokens and user info
      await AsyncStorage.multiSet([
        [TOKEN_KEY, access_token],
        [REFRESH_TOKEN_KEY, refresh_token],
        [USER_KEY, JSON.stringify(account)],
        [CREDENTIALS_KEY, JSON.stringify({ username, password, client_id: clientId })],
      ]);

      this.accessToken = access_token;
      this.refreshToken = refresh_token;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const errorData = error.response.data;
        throw new Error(errorData.error_description || 'Authentication failed');
      }
      throw new Error('Network error. Please check your connection.');
    }
  }

  async refreshAccessToken(): Promise<string> {
    try {
      const [storedRefreshToken, storedCredentials] = await AsyncStorage.multiGet([
        REFRESH_TOKEN_KEY,
        CREDENTIALS_KEY,
      ]);

      const refreshToken = storedRefreshToken[1];
      const credentials: StoredCredentials | null = storedCredentials[1]
        ? JSON.parse(storedCredentials[1])
        : null;

      if (!refreshToken || !credentials) {
        throw new Error('No refresh token available');
      }

      const formData = new URLSearchParams();
      formData.append('grant_type', 'refresh_token');
      formData.append('refresh_token', refreshToken);
      formData.append('client_id', credentials.client_id);
      formData.append('remember_me', 'true');

      const response = await axios.post<AuthResponse>(`${AUTH_BASE_URL}/token`, formData.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
      });

      const { access_token, refresh_token: new_refresh_token, account } = response.data;

      await AsyncStorage.multiSet([
        [TOKEN_KEY, access_token],
        [REFRESH_TOKEN_KEY, new_refresh_token],
        [USER_KEY, JSON.stringify(account)],
      ]);

      this.accessToken = access_token;
      this.refreshToken = new_refresh_token;

      return access_token;
    } catch (error) {
      // If refresh fails, clear all auth data
      await this.logout();
      throw new Error('Session expired. Please login again.');
    }
  }

  async getAccessToken(): Promise<string | null> {
    if (this.accessToken) {
      return this.accessToken;
    }

    const token = await AsyncStorage.getItem(TOKEN_KEY);
    this.accessToken = token;
    return token;
  }

  async getUserInfo(): Promise<any> {
    const userJson = await AsyncStorage.getItem(USER_KEY);
    return userJson ? JSON.parse(userJson) : null;
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await this.getAccessToken();
    return token !== null;
  }

  async logout(): Promise<void> {
    try {
      const token = await this.getAccessToken();
      const user = await this.getUserInfo();

      if (token && user?.id) {
        // Call logout endpoint
        await axios.post(
          `${AUTH_BASE_URL}/${user.id}/logout`,
          {},
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json',
            },
          }
        ).catch(() => {
          // Ignore logout errors
        });
      }
    } finally {
      // Clear all stored data
      await AsyncStorage.multiRemove([
        TOKEN_KEY,
        REFRESH_TOKEN_KEY,
        USER_KEY,
        CREDENTIALS_KEY,
      ]);

      this.accessToken = null;
      this.refreshToken = null;
    }
  }
}

export const authService = new AuthService();

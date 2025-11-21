/**
 * Axios API client with automatic Bearer token injection
 * Supports multiple base URLs for different API endpoints
 */

import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from 'axios';
import { getToken, clearToken } from './tokenStorage';

// Primary auth endpoint - direct URL (CORS must be enabled on server)
const AUTH_BASE_URL = 'https://app.automationintellect.com/api';

// Secondary data endpoint (existing)
const DATA_BASE_URL = 'http://lowcost-env.upd2vnf6k6.us-west-2.elasticbeanstalk.com';

/**
 * Main API client for authenticated requests
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: DATA_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

/**
 * Auth API client for authentication endpoints
 */
export const authApiClient: AxiosInstance = axios.create({
  baseURL: AUTH_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request interceptor: Inject Bearer token into every request
 */
const tokenInterceptor = async (config: InternalAxiosRequestConfig) => {
  const token = await getToken();

  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
};

/**
 * Response interceptor: Handle 401 unauthorized errors
 */
const unauthorizedInterceptor = async (error: AxiosError) => {
  if (error.response?.status === 401) {
    // Token expired or invalid - clear storage
    await clearToken();
    console.warn('Authentication token expired or invalid');
  }
  return Promise.reject(error);
};

// Apply interceptors to main API client
apiClient.interceptors.request.use(tokenInterceptor, (error) => Promise.reject(error));
apiClient.interceptors.response.use((response) => response, unauthorizedInterceptor);

// Apply interceptors to auth API client
authApiClient.interceptors.request.use(tokenInterceptor, (error) => Promise.reject(error));
authApiClient.interceptors.response.use((response) => response, unauthorizedInterceptor);

export { AUTH_BASE_URL, DATA_BASE_URL };

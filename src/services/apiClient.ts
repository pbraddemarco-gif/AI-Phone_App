/**
 * Axios API clients with automatic Bearer token injection.
 * In development, route through the local proxy (localhost:3001) to handle CORS and centralize auth.
 * In production, connect directly to upstream servers.
 */

import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from 'axios';
import { Platform } from 'react-native';
import { getToken, clearToken } from './tokenStorage';

// Production/Direct endpoints (bypass proxy)
const PROD_AUTH_BASE_URL = 'https://app.automationintellect.com/api';
const PROD_DATA_BASE_URL = 'http://lowcost-env.upd2vnf6k6.us-west-2.elasticbeanstalk.com';

// Local development proxy endpoints
const DEV_PROXY_AUTH = 'http://localhost:3001/api/auth';
const DEV_PROXY_DATA = 'http://localhost:3001/api/data';

// Check if we're in development mode
const isDevelopment = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';

// Override with explicit env vars if provided
const envAuth = process.env.EXPO_PUBLIC_AUTH_BASE;
const envData = process.env.EXPO_PUBLIC_API_BASE;

// Determine which endpoints to use
const resolvedAuthBase = envAuth || (isDevelopment ? DEV_PROXY_AUTH : PROD_AUTH_BASE_URL);
const resolvedDataBase = envData || (isDevelopment ? DEV_PROXY_DATA : PROD_DATA_BASE_URL);

console.log('[apiClient] Environment: development=' + isDevelopment);
console.log('[apiClient] Using proxy auth:', resolvedAuthBase === DEV_PROXY_AUTH);
console.log('[apiClient] Using proxy data:', resolvedDataBase === DEV_PROXY_DATA);

/**
 * Main API client (data)
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: resolvedDataBase,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

/**
 * Auth API client (login, tokens)
 */
export const authApiClient: AxiosInstance = axios.create({
  baseURL: resolvedAuthBase,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

console.log('[apiClient] Data baseURL resolved =>', resolvedDataBase);
console.log('[apiClient] Auth baseURL resolved =>', resolvedAuthBase);

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
    await clearToken();
    console.warn('Authentication token expired or invalid');
  }
  return Promise.reject(error);
};

apiClient.interceptors.request.use(tokenInterceptor, (error) => Promise.reject(error));
apiClient.interceptors.response.use((response) => response, unauthorizedInterceptor);
authApiClient.interceptors.request.use(tokenInterceptor, (error) => Promise.reject(error));
authApiClient.interceptors.response.use((response) => response, unauthorizedInterceptor);

export { PROD_AUTH_BASE_URL, PROD_DATA_BASE_URL };

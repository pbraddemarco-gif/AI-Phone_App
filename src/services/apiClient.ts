/**
 * Axios API clients with automatic Bearer token injection.
 * In development, route through the local proxy (localhost:3001) to handle CORS and centralize auth.
 * In production, connect directly to upstream servers.
 */

import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from 'axios';
import { Platform } from 'react-native';
import { getToken, clearToken } from './tokenStorage';
import Constants from 'expo-constants';

// Production/Direct endpoints
const PROD_AUTH_BASE_URL = 'https://app.automationintellect.com/api';
const PROD_DATA_BASE_URL = 'http://lowcost-env.upd2vnf6k6.us-west-2.elasticbeanstalk.com';

// Get the dev machine IP from Expo's manifest
// When using tunnel/LAN, Expo provides the hostUri
const getDevProxyBase = () => {
  if (Constants.expoConfig?.hostUri) {
    // Extract the IP from hostUri (format: "192.168.x.x:8081")
    const host = Constants.expoConfig.hostUri.split(':')[0];
    return `http://${host}:3001`;
  }
  // Fallback to localhost for web or if hostUri not available
  return 'http://localhost:3001';
};

const devProxyBase = getDevProxyBase();

// Local development proxy endpoints
const DEV_PROXY_AUTH = `${devProxyBase}/api/auth`;
const DEV_PROXY_DATA = `${devProxyBase}/api/data`;

// Check environment - if using tunnel mode, bypass proxy and use production directly
const isDevelopment = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
const isTunnelMode = Constants.expoConfig?.hostUri?.includes('.exp.direct');

// When using tunnel, bypass proxy and connect directly to production
const resolvedAuthBase = isDevelopment && !isTunnelMode ? DEV_PROXY_AUTH : PROD_AUTH_BASE_URL;
const resolvedDataBase = isDevelopment && !isTunnelMode ? DEV_PROXY_DATA : PROD_DATA_BASE_URL;

console.log('[apiClient] Environment:', isDevelopment ? 'development' : 'production');
console.log('[apiClient] Tunnel mode:', isTunnelMode);
console.log('[apiClient] Dev proxy base:', devProxyBase);
console.log('[apiClient] Auth:', resolvedAuthBase);
console.log('[apiClient] Data:', resolvedDataBase);

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

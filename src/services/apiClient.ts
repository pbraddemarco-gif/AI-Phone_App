/**
 * Axios API clients with automatic Bearer token injection.
 * For web (Expo Web / browser) we must route through the local proxy to avoid CORS.
 * If EXPO_PUBLIC_* env vars are missing we fall back to localhost proxy defaults.
 */

import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from 'axios';
import { Platform } from 'react-native';
import { getToken, clearToken } from './tokenStorage';

// Upstream (native direct calls) endpoints
const AUTH_BASE_URL = 'https://app.automationintellect.com/api';
const DATA_BASE_URL = 'http://lowcost-env.upd2vnf6k6.us-west-2.elasticbeanstalk.com';

// Web proxy enforced bases (proxy/server.js). We prefer explicit env values; fallback if absent.
const envAuth = process.env.EXPO_PUBLIC_AUTH_BASE;
const envData = process.env.EXPO_PUBLIC_API_BASE;
const proxyAuthFallback = 'http://localhost:3001/api/auth';
const proxyDataFallback = 'http://localhost:3001/api/data';

const usingWeb = Platform.OS === 'web';
const resolvedAuthBase = usingWeb ? envAuth || proxyAuthFallback : envAuth || AUTH_BASE_URL;
const resolvedDataBase = usingWeb ? envData || proxyDataFallback : envData || DATA_BASE_URL;

if (usingWeb) {
  if (!envAuth)
    console.warn('[apiClient] EXPO_PUBLIC_AUTH_BASE missing; using fallback', proxyAuthFallback);
  if (!envData)
    console.warn('[apiClient] EXPO_PUBLIC_API_BASE missing; using fallback', proxyDataFallback);
}

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

export { AUTH_BASE_URL, DATA_BASE_URL };

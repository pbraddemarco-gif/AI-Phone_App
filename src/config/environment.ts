/**
 * Environment configuration and validation
 * Centralizes all environment variable access with type safety
 */

import Constants from 'expo-constants';

export interface AppConfig {
  apiBaseUrl: string;
  authBaseUrl: string;
  environment: 'development' | 'production';
  isDevelopment: boolean;
  isProduction: boolean;
}

/**
 * Get environment configuration with fallbacks
 * Validates that required configuration is present
 */
export function getAppConfig(): AppConfig {
  const isDevelopment = __DEV__;
  const environment = isDevelopment ? 'development' : 'production';

  // In production, these MUST be HTTPS
  // In development, we allow HTTP for local proxy
  const authBaseUrl = isDevelopment
    ? process.env.EXPO_PUBLIC_AUTH_BASE || 'https://app.automationintellect.com/api'
    : 'https://app.automationintellect.com/api';

  const apiBaseUrl = isDevelopment
    ? process.env.EXPO_PUBLIC_API_BASE ||
      'https://lowcost-env.upd2vnf6k6.us-west-2.elasticbeanstalk.com'
    : 'https://lowcost-env.upd2vnf6k6.us-west-2.elasticbeanstalk.com';

  // Security: Validate HTTPS in production
  if (!isDevelopment) {
    if (!authBaseUrl.startsWith('https://')) {
      throw new Error('Production auth endpoint must use HTTPS');
    }
    if (!apiBaseUrl.startsWith('https://')) {
      throw new Error('Production API endpoint must use HTTPS');
    }
  }

  return {
    apiBaseUrl,
    authBaseUrl,
    environment,
    isDevelopment,
    isProduction: !isDevelopment,
  };
}

/**
 * Validate app configuration on startup
 * Throws if configuration is invalid
 */
export function validateAppConfig(): void {
  try {
    const config = getAppConfig();
    if (__DEV__) {
      console.debug('[Config] Environment:', config.environment);
      console.debug('[Config] Auth endpoint:', config.authBaseUrl);
      console.debug('[Config] API endpoint:', config.apiBaseUrl);
    }
  } catch (error) {
    if (__DEV__) console.debug('[Config] FATAL: Invalid configuration', error);
    throw error;
  }
}

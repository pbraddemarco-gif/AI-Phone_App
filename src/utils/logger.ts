/**
 * Safe logging utility - prevents accidental PII/token leakage in production
 *
 * Usage:
 *   import { safeLog, sanitizeForLog } from '@/utils/logger';
 *   safeLog('debug', 'User action', { userId: user.id }); // Logged only in dev
 *   console.debug('Token:', sanitizeForLog(token)); // Always redacts tokens
 */

const isDevelopment = __DEV__;

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Safe logging that respects environment
 * @param level - Log level
 * @param message - Log message
 * @param data - Optional data object (will be sanitized)
 */
export function safeLog(level: LogLevel, message: string, data?: any): void {
  // In production, only log warnings and errors
  if (!isDevelopment && (level === 'debug' || level === 'info')) {
    return;
  }

  const sanitized = data ? sanitizeForLog(data) : undefined;

  switch (level) {
    case 'debug':
      console.debug(`[DEBUG] ${message}`, sanitized);
      break;
    case 'info':
      console.debug(`[INFO] ${message}`, sanitized);
      break;
    case 'warn':
      console.warn(`[WARN] ${message}`, sanitized);
      break;
    case 'error':
      console.error(`[ERROR] ${message}`, sanitized);
      break;
  }
}

/**
 * Redact sensitive fields from objects before logging
 * @param data - Any data that might contain sensitive info
 * @returns Sanitized data safe for logging
 */
export function sanitizeForLog(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }

  // Primitives that look like tokens/keys
  if (typeof data === 'string') {
    // JWT pattern (3 parts separated by dots)
    if (data.match(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/)) {
      return '[REDACTED_JWT]';
    }
    // Long base64-like strings
    if (data.length > 50 && data.match(/^[A-Za-z0-9+/=]+$/)) {
      return `[REDACTED_TOKEN:${data.length}chars]`;
    }
    return data;
  }

  if (typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForLog(item));
  }

  // Redact known sensitive keys
  const sensitiveKeys = [
    'password',
    'token',
    'accessToken',
    'access_token',
    'refreshToken',
    'refresh_token',
    'authorization',
    'Authorization',
    'secret',
    'apiKey',
    'api_key',
    'Bearer',
  ];

  const sanitized: any = {};
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = sensitiveKeys.some((sk) => lowerKey.includes(sk.toLowerCase()));

    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = sanitizeForLog(value);
    }
  }

  return sanitized;
}

/**
 * Log only in development mode
 */
export function devLog(message: string, ...args: any[]): void {
  if (isDevelopment) {
    console.debug(message, ...args.map(sanitizeForLog));
  }
}

/**
 * Assert a condition and throw in development, log error in production
 */
export function softAssert(condition: boolean, message: string): void {
  if (!condition) {
    if (isDevelopment) {
      throw new Error(`Assertion failed: ${message}`);
    } else {
      console.error(`[ASSERTION] ${message}`);
    }
  }
}

/**
 * Input validation utilities for secure data handling
 * Prevents injection attacks and ensures data integrity
 */

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Validate username (alphanumeric, underscores, hyphens, dots)
 * Must be 3-50 characters
 */
export function isValidUsername(username: string): boolean {
  const usernameRegex = /^[a-zA-Z0-9._-]{3,50}$/;
  return usernameRegex.test(username);
}

/**
 * Sanitize string for safe display (prevent XSS in web context)
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .trim()
    .slice(0, 1000); // Reasonable max length
}

/**
 * Validate machine ID format
 */
export function isValidMachineId(id: any): boolean {
  return typeof id === 'number' && id > 0 && Number.isInteger(id);
}

/**
 * Validate customer ID format
 */
export function isValidCustomerId(id: any): boolean {
  return typeof id === 'number' && id > 0 && Number.isInteger(id);
}

/**
 * Validate plant ID format
 */
export function isValidPlantId(id: any): boolean {
  return typeof id === 'number' && id > 0 && Number.isInteger(id);
}

/**
 * Validate date string (ISO 8601)
 */
export function isValidISODate(dateString: string): boolean {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Validate password strength
 * At least 8 characters
 */
export function isValidPassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters' };
  }
  if (password.length > 128) {
    return { valid: false, message: 'Password is too long' };
  }
  return { valid: true };
}

/**
 * Validate numeric input is within range
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return typeof value === 'number' && value >= min && value <= max && !isNaN(value);
}

/**
 * Sanitize filename (remove path traversal attempts)
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[/\\]/g, '') // Remove path separators
    .replace(/\.\./g, '') // Remove parent directory references
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace special chars with underscore
    .slice(0, 255); // Max filename length
}

/**
 * Validate JWT format (basic structure check)
 */
export function isValidJWTFormat(token: string): boolean {
  const parts = token.split('.');
  return parts.length === 3 && parts.every(part => part.length > 0);
}

/**
 * Type guard for non-null values
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

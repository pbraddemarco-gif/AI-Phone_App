/**
 * Tests for validation utilities
 */

import {
  isValidEmail,
  isValidUsername,
  isValidPassword,
  sanitizeString,
  isValidMachineId,
  isValidCustomerId,
  isValidJWTFormat,
  sanitizeFilename,
  isInRange,
  isDefined,
} from '../validation';

describe('Validation Utilities', () => {
  describe('isValidEmail', () => {
    it('should accept valid email addresses', () => {
      expect(isValidEmail('user@example.com')).toBe(true);
      expect(isValidEmail('test.user@company.co.uk')).toBe(true);
      expect(isValidEmail('user+tag@domain.com')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('user@')).toBe(false);
      expect(isValidEmail('@domain.com')).toBe(false);
      expect(isValidEmail('user @example.com')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });

    it('should reject emails longer than 254 characters', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      expect(isValidEmail(longEmail)).toBe(false);
    });
  });

  describe('isValidUsername', () => {
    it('should accept valid usernames', () => {
      expect(isValidUsername('user123')).toBe(true);
      expect(isValidUsername('john.doe')).toBe(true);
      expect(isValidUsername('user_name-2024')).toBe(true);
    });

    it('should reject invalid usernames', () => {
      expect(isValidUsername('ab')).toBe(false); // Too short
      expect(isValidUsername('a'.repeat(51))).toBe(false); // Too long
      expect(isValidUsername('user@name')).toBe(false); // Invalid char
      expect(isValidUsername('user name')).toBe(false); // Space
      expect(isValidUsername('')).toBe(false);
    });
  });

  describe('isValidPassword', () => {
    it('should accept valid passwords', () => {
      expect(isValidPassword('password123').valid).toBe(true);
      expect(isValidPassword('a'.repeat(8)).valid).toBe(true);
      expect(isValidPassword('ComplexP@ss123').valid).toBe(true);
    });

    it('should reject passwords that are too short', () => {
      const result = isValidPassword('short');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('8 characters');
    });

    it('should reject passwords that are too long', () => {
      const result = isValidPassword('a'.repeat(129));
      expect(result.valid).toBe(false);
      expect(result.message).toContain('too long');
    });
  });

  describe('sanitizeString', () => {
    it('should remove potential HTML tags', () => {
      expect(sanitizeString('Hello <script>alert(1)</script>')).toBe('Hello scriptalert(1)/script');
      expect(sanitizeString('Normal text')).toBe('Normal text');
    });

    it('should trim whitespace', () => {
      expect(sanitizeString('  text  ')).toBe('text');
    });

    it('should limit length to 1000 chars', () => {
      const longString = 'a'.repeat(1500);
      expect(sanitizeString(longString).length).toBe(1000);
    });
  });

  describe('isValidMachineId', () => {
    it('should accept valid machine IDs', () => {
      expect(isValidMachineId(1)).toBe(true);
      expect(isValidMachineId(999)).toBe(true);
    });

    it('should reject invalid machine IDs', () => {
      expect(isValidMachineId(0)).toBe(false);
      expect(isValidMachineId(-1)).toBe(false);
      expect(isValidMachineId(1.5)).toBe(false);
      expect(isValidMachineId('1')).toBe(false);
      expect(isValidMachineId(null)).toBe(false);
    });
  });

  describe('isValidJWTFormat', () => {
    it('should accept valid JWT format', () => {
      expect(isValidJWTFormat('header.payload.signature')).toBe(true);
      expect(isValidJWTFormat('eyJhbGc.eyJzdWI.SflKxwRJ')).toBe(true);
    });

    it('should reject invalid JWT format', () => {
      expect(isValidJWTFormat('invalid')).toBe(false);
      expect(isValidJWTFormat('only.two')).toBe(false);
      expect(isValidJWTFormat('too.many.parts.here')).toBe(false);
      expect(isValidJWTFormat('...')).toBe(false);
    });
  });

  describe('sanitizeFilename', () => {
    it('should remove path separators', () => {
      expect(sanitizeFilename('../etc/passwd')).toBe('..etcpasswd');
      expect(sanitizeFilename('folder\\file.txt')).toBe('folderfile.txt');
    });

    it('should replace special characters', () => {
      expect(sanitizeFilename('file @#$.txt')).toBe('file___.txt');
    });

    it('should limit length to 255 chars', () => {
      const longName = 'a'.repeat(300) + '.txt';
      expect(sanitizeFilename(longName).length).toBeLessThanOrEqual(255);
    });
  });

  describe('isInRange', () => {
    it('should validate numbers in range', () => {
      expect(isInRange(5, 0, 10)).toBe(true);
      expect(isInRange(0, 0, 10)).toBe(true);
      expect(isInRange(10, 0, 10)).toBe(true);
    });

    it('should reject numbers out of range', () => {
      expect(isInRange(-1, 0, 10)).toBe(false);
      expect(isInRange(11, 0, 10)).toBe(false);
      expect(isInRange(NaN, 0, 10)).toBe(false);
    });
  });

  describe('isDefined', () => {
    it('should return true for defined values', () => {
      expect(isDefined(0)).toBe(true);
      expect(isDefined('')).toBe(true);
      expect(isDefined(false)).toBe(true);
      expect(isDefined([])).toBe(true);
    });

    it('should return false for null/undefined', () => {
      expect(isDefined(null)).toBe(false);
      expect(isDefined(undefined)).toBe(false);
    });
  });
});

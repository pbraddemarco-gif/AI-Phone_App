/**
 * Tests for safe logging utilities
 */

import { sanitizeForLog, safeLog } from '../logger';

describe('Logger Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sanitizeForLog', () => {
    it('should redact JWT tokens', () => {
      const jwt =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
      expect(sanitizeForLog(jwt)).toBe('[REDACTED_JWT]');
    });

    it('should redact long base64 strings', () => {
      const longToken = 'a'.repeat(60);
      const result = sanitizeForLog(longToken);
      expect(result).toContain('[REDACTED_TOKEN:');
      expect(result).toContain('chars]');
    });

    it('should redact sensitive object keys', () => {
      const data = {
        username: 'john',
        password: 'secret123',
        token: 'abc.def.ghi',
        accessToken: 'xyz',
        normalField: 'visible',
      };

      const sanitized = sanitizeForLog(data);

      expect(sanitized.username).toBe('john');
      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.token).toBe('[REDACTED]');
      expect(sanitized.accessToken).toBe('[REDACTED]');
      expect(sanitized.normalField).toBe('visible');
    });

    it('should handle nested objects', () => {
      const data = {
        user: {
          name: 'John',
          secret: 'hidden',
        },
        token: 'abc.def.ghi',
      };

      const sanitized = sanitizeForLog(data);

      expect(sanitized.user.name).toBe('John');
      expect(sanitized.user.secret).toBe('[REDACTED]');
      expect(sanitized.token).toBe('[REDACTED]');
    });

    it('should handle arrays', () => {
      const data = [
        { name: 'User1', password: 'pass1' },
        { name: 'User2', password: 'pass2' },
      ];

      const sanitized = sanitizeForLog(data);

      expect(sanitized[0].name).toBe('User1');
      expect(sanitized[0].password).toBe('[REDACTED]');
      expect(sanitized[1].password).toBe('[REDACTED]');
    });

    it('should handle null and undefined', () => {
      expect(sanitizeForLog(null)).toBe(null);
      expect(sanitizeForLog(undefined)).toBe(undefined);
    });

    it('should preserve normal strings', () => {
      expect(sanitizeForLog('normal string')).toBe('normal string');
      expect(sanitizeForLog('short')).toBe('short');
    });
  });

  describe('safeLog', () => {
    it('should sanitize data before logging', () => {
      const consoleSpy = jest.spyOn(console, 'log');

      safeLog('info', 'Test message', { password: 'secret' });

      // Verify password was redacted
      const loggedData = consoleSpy.mock.calls[0][1];
      expect(loggedData.password).toBe('[REDACTED]');
    });
  });
});

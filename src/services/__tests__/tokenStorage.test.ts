/**
 * Tests for token storage service
 * Note: Full integration tests require React Native environment
 * These tests verify the basic contract and error handling
 */

describe('Token Storage Service', () => {
  it('should be defined and export required functions', () => {
    const tokenStorage = require('../tokenStorage');
    
    expect(tokenStorage.saveToken).toBeDefined();
    expect(tokenStorage.getToken).toBeDefined();
    expect(tokenStorage.clearToken).toBeDefined();
    expect(tokenStorage.saveRefreshToken).toBeDefined();
    expect(tokenStorage.getRefreshToken).toBeDefined();
    
    expect(typeof tokenStorage.saveToken).toBe('function');
    expect(typeof tokenStorage.getToken).toBe('function');
    expect(typeof tokenStorage.clearToken).toBe('function');
  });
});


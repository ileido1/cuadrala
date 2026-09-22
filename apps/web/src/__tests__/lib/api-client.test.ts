import { describe, it, expect, beforeEach, vi } from 'vitest';
import { apiClient } from '~/lib/api-client';

describe('API Client Token Management', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('setTokens', () => {
    it('should store tokens in localStorage', () => {
      const accessToken = 'test-access-token';
      const refreshToken = 'test-refresh-token';
      const expiresIn = 3600;

      apiClient.setTokens(accessToken, refreshToken, expiresIn);

      expect(localStorage.getItem('accessToken')).toBe(accessToken);
      expect(localStorage.getItem('refreshToken')).toBe(refreshToken);
    });

    it('should calculate and store token expiry time', () => {
      const expiresIn = 900; // 15 minutes

      apiClient.setTokens('token', 'refresh', expiresIn);

      const expiresAt = localStorage.getItem('tokenExpiresAt');
      expect(expiresAt).toBeDefined();

      const expiresAtTime = parseInt(expiresAt!);
      const now = Date.now();
      const expectedTime = now + expiresIn * 1000;

      // Allow 1 second margin for test execution
      expect(Math.abs(expiresAtTime - expectedTime)).toBeLessThan(1000);
    });

    it('should throw on invalid access token', () => {
      expect(() => {
        apiClient.setTokens('', 'refresh', 3600);
      }).toThrow();
    });

    it('should throw on invalid refresh token', () => {
      expect(() => {
        apiClient.setTokens('access', '', 3600);
      }).toThrow();
    });
  });

  describe('clearTokens', () => {
    it('should remove all tokens from localStorage', () => {
      apiClient.setTokens('access', 'refresh', 3600);

      apiClient.clearTokens();

      expect(localStorage.getItem('accessToken')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
      expect(localStorage.getItem('tokenExpiresAt')).toBeNull();
    });
  });

  describe('setupCrossTabSync', () => {
    it('should return a cleanup function', () => {
      const cleanup = apiClient.setupCrossTabSync();

      expect(typeof cleanup).toBe('function');
    });

    it('should call callback when tokens change', () => {
      const callback = vi.fn();
      const cleanup = apiClient.setupCrossTabSync(callback);

      // Simulate storage event from another tab
      const event = new StorageEvent('storage', {
        key: 'accessToken',
        newValue: 'new-token',
        oldValue: 'old-token',
      });

      window.dispatchEvent(event);
      expect(callback).toHaveBeenCalled();

      cleanup();
    });

    it('should work without callback', () => {
      const cleanup = apiClient.setupCrossTabSync();

      const event = new StorageEvent('storage', {
        key: 'accessToken',
        newValue: 'new-token',
      });

      expect(() => {
        window.dispatchEvent(event);
      }).not.toThrow();

      cleanup();
    });

    it('should handle multiple storage keys', () => {
      const callback = vi.fn();
      const cleanup = apiClient.setupCrossTabSync(callback);

      // Test each token key
      ['accessToken', 'refreshToken', 'tokenExpiresAt'].forEach((key) => {
        callback.mockClear();
        const event = new StorageEvent('storage', {
          key,
          newValue: 'new-value',
        });
        window.dispatchEvent(event);
        expect(callback).toHaveBeenCalled();
      });

      cleanup();
    });

    it('should not call callback for unrelated storage changes', () => {
      const callback = vi.fn();
      const cleanup = apiClient.setupCrossTabSync(callback);

      const event = new StorageEvent('storage', {
        key: 'someOtherKey',
        newValue: 'value',
      });

      window.dispatchEvent(event);
      expect(callback).not.toHaveBeenCalled();

      cleanup();
    });
  });

  describe('socialLogin API method', () => {
    it('should have socialLogin method', () => {
      expect(apiClient.auth.socialLogin).toBeDefined();
      expect(typeof apiClient.auth.socialLogin).toBe('function');
    });
  });
});

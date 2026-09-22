'use client';

import { useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { apiClient } from '~/lib/api-client';

/**
 * Hook to manage token refresh and cross-tab synchronization
 * Sets up automatic token refresh on 401 errors and listens to token changes from other tabs
 */
export function useTokenRefresh() {
  const { data: session, update: updateSession } = useSession();

  // Setup cross-tab sync
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Setup cross-tab token sync listener
    const unsubscribe = apiClient.setupCrossTabSync(() => {
      // When tokens change in another tab, re-fetch the session
      updateSession();
    });

    return () => {
      unsubscribe();
    };
  }, [updateSession]);

  // Check if token is expired and refresh if needed
  const checkAndRefreshToken = useCallback(async () => {
    if (!session?.accessToken) {
      return false;
    }

    const expiresAt = localStorage.getItem('tokenExpiresAt');
    if (!expiresAt) {
      return false;
    }

    const isExpired = Date.now() > parseInt(expiresAt);
    if (!isExpired) {
      return true; // Token is still valid
    }

    // Token is expired, attempt refresh
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        return false;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'}${process.env.NEXT_PUBLIC_API_BASE_PATH ?? '/api/v1/'}auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        // Refresh failed, clear tokens and redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('tokenExpiresAt');
        if (typeof window !== 'undefined') {
          window.location.href = '/login?error=session_expired';
        }
        return false;
      }

      const data = await response.json();
      const { accessToken, refreshToken: newRefresh, expiresIn } = data.data;

      // Store new tokens
      apiClient.setTokens(accessToken, newRefresh, expiresIn);

      // Update session
      await updateSession();

      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }, [session, updateSession]);

  return {
    checkAndRefreshToken,
  };
}

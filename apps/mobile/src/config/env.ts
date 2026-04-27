const RAW_BASE = process.env.EXPO_PUBLIC_API_BASE_URL;

/**
 * Base URL for API v1 (e.g. http://localhost:4000/api/v1).
 * Override with EXPO_PUBLIC_API_BASE_URL in .env or app config.
 */
export const API_BASE_URL =
  typeof RAW_BASE === 'string' && RAW_BASE.trim().length > 0
    ? RAW_BASE.trim().replace(/\/$/, '')
    : 'http://localhost:4000/api/v1';

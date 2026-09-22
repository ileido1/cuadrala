/**
 * Shared constants/helpers for the Google/Apple social-login → NextAuth
 * session bridge. Single source of truth for the password marker so
 * GoogleSignInButton and lib/auth.ts can never drift apart.
 */

export const SOCIAL_LOGIN_PASSWORD_PREFIX = 'social-login-';

/**
 * Builds the placeholder "password" sent to NextAuth's Credentials
 * provider for a social-login session. It is never sent to the backend
 * as a real password — lib/auth.ts detects this prefix and takes the
 * token-verification branch instead of a password login.
 */
export function buildSocialLoginPassword(userId: string): string {
  return `${SOCIAL_LOGIN_PASSWORD_PREFIX}${userId}`;
}

export function isSocialLoginPassword(password: string): boolean {
  return password.startsWith(SOCIAL_LOGIN_PASSWORD_PREFIX);
}

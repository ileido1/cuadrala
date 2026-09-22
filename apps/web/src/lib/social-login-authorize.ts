/**
 * Pure NextAuth Credentials `authorize()` logic, deliberately kept free of
 * any `next-auth` import so it can be unit tested without pulling in
 * next-auth's `next/server` dependency (which vitest's jsdom environment
 * cannot resolve). lib/auth.ts wires `authorizeCredentials` into the
 * Credentials provider unchanged.
 */
import { isSocialLoginPassword } from './social-auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
const API_BASE_PATH = process.env.NEXT_PUBLIC_API_BASE_PATH ?? '/api/v1/';

export type AuthorizedSessionUser = {
  id: string;
  email: string;
  name: string;
  subscriptionType: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  onboardingComplete: boolean;
};

type VerifiedBackendUser = {
  id: string;
  email: string;
  name: string;
  subscriptionType: string;
  onboardingComplete: boolean;
};

/**
 * Verifies a Google/Apple social-login access token by calling the
 * backend's authenticated "who am I" endpoint with it. Returns the
 * backend's own view of the user, or null if the token is missing,
 * invalid, expired, or the request fails for any reason.
 *
 * This is the only source of truth for identity/onboarding data on the
 * social-login path — client-supplied fields are never trusted directly,
 * which is what prevents someone from forging a session by calling
 * signIn('credentials', { password: 'social-login-x', accessToken: '...' })
 * with an arbitrary token.
 */
export async function verifySocialAccessToken(
  _accessToken: string,
): Promise<VerifiedBackendUser | null> {
  if (!_accessToken || typeof _accessToken !== 'string') {
    return null;
  }

  try {
    const response = await fetch(`${API_URL}${API_BASE_PATH}users/me`, {
      headers: { Authorization: `Bearer ${_accessToken}` },
    });

    if (!response.ok) {
      return null;
    }

    const json = await response.json();
    const data = json?.data;

    if (
      typeof data?.id !== 'string' ||
      typeof data?.email !== 'string' ||
      data.id === '' ||
      data.email === ''
    ) {
      return null;
    }

    return {
      id: data.id,
      email: data.email,
      name: typeof data.name === 'string' ? data.name : '',
      subscriptionType: typeof data.subscriptionType === 'string' ? data.subscriptionType : 'free',
      onboardingComplete: Boolean(data.onboardingComplete),
    };
  } catch {
    return null;
  }
}

async function authorizePasswordLoginSV(
  _email: string,
  _password: string,
): Promise<AuthorizedSessionUser | null> {
  try {
    const response = await fetch(`${API_URL}${API_BASE_PATH}auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: _email, password: _password }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (!data.success) {
      return null;
    }

    const { user, accessToken, refreshToken, expiresIn } = data.data;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      subscriptionType: user.subscriptionType,
      accessToken,
      refreshToken,
      expiresIn,
      onboardingComplete: Boolean(user.onboardingComplete),
    };
  } catch {
    return null;
  }
}

/**
 * NextAuth Credentials `authorize()` implementation.
 *
 * Two branches:
 * - Social login: `password` carries the SOCIAL_LOGIN_PASSWORD_PREFIX
 *   marker set by GoogleSignInButton after a successful POST /auth/social.
 *   We never attempt a password login for these users (they have
 *   passwordHash: null on the backend and would always be rejected).
 *   Instead we verify the already-issued accessToken against the backend
 *   and mint the session strictly from the backend's response.
 * - Password login: unchanged existing behavior.
 */
export async function authorizeCredentials(
  //? Widened to Record<string, unknown>: real callers (GoogleSignInButton)
  //? pass extra fields such as onboardingComplete that this function
  //? deliberately ignores in favor of the backend-verified value — the
  //? type must still accept them without narrowing what's tolerated.
  _credentials: Record<string, unknown> | undefined,
): Promise<AuthorizedSessionUser | null> {
  if (!_credentials?.email || !_credentials?.password) {
    return null;
  }

  const email = String(_credentials.email);
  const password = String(_credentials.password);

  if (isSocialLoginPassword(password)) {
    const accessToken = typeof _credentials.accessToken === 'string' ? _credentials.accessToken : '';
    const verified = await verifySocialAccessToken(accessToken);

    if (!verified || verified.email.toLowerCase() !== email.toLowerCase()) {
      return null;
    }

    const refreshToken = typeof _credentials.refreshToken === 'string' ? _credentials.refreshToken : '';
    const expiresIn =
      typeof _credentials.expiresIn === 'number'
        ? _credentials.expiresIn
        : Number(_credentials.expiresIn) || 900;

    return {
      id: verified.id,
      email: verified.email,
      name: verified.name,
      subscriptionType: verified.subscriptionType,
      onboardingComplete: verified.onboardingComplete,
      accessToken,
      refreshToken,
      expiresIn,
    };
  }

  return authorizePasswordLoginSV(email, password);
}

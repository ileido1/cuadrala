import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { authorizeCredentials, verifySocialAccessToken } from '~/lib/social-login-authorize';
import { buildSocialLoginPassword } from '~/lib/social-auth';

const ORIGINAL_FETCH = global.fetch;

describe('verifySocialAccessToken', () => {
  afterEach(() => {
    global.fetch = ORIGINAL_FETCH;
    vi.restoreAllMocks();
  });

  it('returns the verified user when the backend accepts the token', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          id: 'user-1',
          email: 'player@example.com',
          name: 'Player One',
          subscriptionType: 'free',
          onboardingComplete: true,
        },
      }),
    }) as unknown as typeof fetch;

    const result = await verifySocialAccessToken('valid-token');

    expect(result).toEqual({
      id: 'user-1',
      email: 'player@example.com',
      name: 'Player One',
      subscriptionType: 'free',
      onboardingComplete: true,
    });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/users/me'),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer valid-token' }),
      }),
    );
  });

  it('returns null when the backend rejects the token', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;

    const result = await verifySocialAccessToken('bad-token');

    expect(result).toBeNull();
  });

  it('returns null when the token is empty', async () => {
    global.fetch = vi.fn();
    const result = await verifySocialAccessToken('');
    expect(result).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('returns null when the network call throws', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network down')) as unknown as typeof fetch;

    const result = await verifySocialAccessToken('valid-token');

    expect(result).toBeNull();
  });
});

describe('authorizeCredentials — social-login branch', () => {
  afterEach(() => {
    global.fetch = ORIGINAL_FETCH;
    vi.restoreAllMocks();
  });

  it('creates a session user from the verified backend response, not from client-supplied fields', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          id: 'user-1',
          email: 'player@example.com',
          name: 'Player One',
          subscriptionType: 'free',
          onboardingComplete: false,
        },
      }),
    }) as unknown as typeof fetch;

    const result = await authorizeCredentials({
      email: 'player@example.com',
      password: buildSocialLoginPassword('user-1'),
      accessToken: 'real-access-token',
      refreshToken: 'real-refresh-token',
      expiresIn: 900,
      // Client-asserted onboardingComplete must be ignored — backend says false.
      onboardingComplete: true,
    });

    expect(result).toMatchObject({
      id: 'user-1',
      email: 'player@example.com',
      name: 'Player One',
      subscriptionType: 'free',
      onboardingComplete: false,
      accessToken: 'real-access-token',
      refreshToken: 'real-refresh-token',
      expiresIn: 900,
    });
  });

  it('rejects when the backend cannot verify the access token', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;

    const result = await authorizeCredentials({
      email: 'player@example.com',
      password: buildSocialLoginPassword('user-1'),
      accessToken: 'forged-token',
    });

    expect(result).toBeNull();
  });

  it('rejects when the verified email does not match the claimed email', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          id: 'user-1',
          email: 'real-owner@example.com',
          name: 'Real Owner',
          subscriptionType: 'free',
          onboardingComplete: true,
        },
      }),
    }) as unknown as typeof fetch;

    const result = await authorizeCredentials({
      email: 'attacker-claimed@example.com',
      password: buildSocialLoginPassword('user-1'),
      accessToken: 'someone-elses-token',
    });

    expect(result).toBeNull();
  });

  it('never calls the password login endpoint for the social branch', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: { id: 'user-1', email: 'player@example.com', name: 'P', subscriptionType: 'free', onboardingComplete: true },
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await authorizeCredentials({
      email: 'player@example.com',
      password: buildSocialLoginPassword('user-1'),
      accessToken: 'real-access-token',
    });

    const calledUrls = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(calledUrls.every((url) => !url.includes('/auth/login'))).toBe(true);
  });
});

describe('authorizeCredentials — password branch (unchanged)', () => {
  afterEach(() => {
    global.fetch = ORIGINAL_FETCH;
    vi.restoreAllMocks();
  });

  it('returns null when email or password is missing', async () => {
    expect(await authorizeCredentials({ email: 'a@b.com' })).toBeNull();
    expect(await authorizeCredentials({ password: 'x' })).toBeNull();
  });

  it('calls the real /auth/login endpoint for a normal password login', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          user: { id: 'user-2', email: 'pw@example.com', name: 'Pw User', subscriptionType: 'free' },
          accessToken: 'pw-access',
          refreshToken: 'pw-refresh',
          expiresIn: 900,
        },
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await authorizeCredentials({ email: 'pw@example.com', password: 'a-real-password' });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/auth/login'),
      expect.objectContaining({ method: 'POST' }),
    );
    expect(result).toMatchObject({ id: 'user-2', email: 'pw@example.com', accessToken: 'pw-access' });
  });

  it('returns null when the password login fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;

    const result = await authorizeCredentials({ email: 'pw@example.com', password: 'wrong' });

    expect(result).toBeNull();
  });
});

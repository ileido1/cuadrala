import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import googleAuthLibrary from 'google-auth-library';
import appleSigninAuth from 'apple-signin-auth';

import { ENV_CONST } from '../../config/env.js';
import { DefaultSocialIdTokenVerifier } from '../../infrastructure/adapters/social_id_token_verifier.js';

const { OAuth2Client } = googleAuthLibrary;

//? Simula el ticket que devuelve google-auth-library con el payload dado.
function mockGooglePayload(_payload: Record<string, unknown>): void {
  vi.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValue({
    getPayload: () => _payload,
  } as never);
}

describe('DefaultSocialIdTokenVerifier', () => {
  const ORIGINAL_GOOGLE = ENV_CONST.GOOGLE_OAUTH_CLIENT_ID;
  const ORIGINAL_APPLE = ENV_CONST.APPLE_SIGNIN_AUDIENCE;

  beforeEach(() => {
    ENV_CONST.GOOGLE_OAUTH_CLIENT_ID = 'google-client-id';
    ENV_CONST.APPLE_SIGNIN_AUDIENCE = 'apple-audience';
  });

  afterEach(() => {
    ENV_CONST.GOOGLE_OAUTH_CLIENT_ID = ORIGINAL_GOOGLE;
    ENV_CONST.APPLE_SIGNIN_AUDIENCE = ORIGINAL_APPLE;
    vi.restoreAllMocks();
  });

  it('should return claims when the google email is verified', async () => {
    mockGooglePayload({ sub: 'g-1', email: 'A@Example.com', email_verified: true, name: 'Ana' });

    const RESULT = await new DefaultSocialIdTokenVerifier().verifyIdTokenSV('google', 'id-token');

    expect(RESULT).toEqual({ providerUserId: 'g-1', email: 'a@example.com', name: 'Ana' });
  });

  //? Sin esto, una cuenta de Google con un email ajeno sin verificar entraba
  //? a la cuenta de Cuádrala de ese email (el login social vincula por email).
  it('should reject with 401 when the google email is not verified', async () => {
    mockGooglePayload({ sub: 'g-1', email: 'victim@example.com', email_verified: false });

    await expect(
      new DefaultSocialIdTokenVerifier().verifyIdTokenSV('google', 'id-token'),
    ).rejects.toMatchObject({ code: 'TOKEN_INVALIDO', statusCode: 401 });
  });

  it('should reject with 401 when google fails to verify the token', async () => {
    vi.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockRejectedValue(
      new Error('Token used too late'),
    );

    await expect(
      new DefaultSocialIdTokenVerifier().verifyIdTokenSV('google', 'id-token'),
    ).rejects.toMatchObject({ code: 'TOKEN_INVALIDO', statusCode: 401 });
  });

  it('should accept apple tokens whose email_verified is the string "true"', async () => {
    vi.spyOn(appleSigninAuth, 'verifyIdToken').mockResolvedValue({
      sub: 'a-1',
      email: 'x@privaterelay.appleid.com',
      email_verified: 'true',
    } as never);

    const RESULT = await new DefaultSocialIdTokenVerifier().verifyIdTokenSV('apple', 'id-token');

    expect(RESULT).toEqual({ providerUserId: 'a-1', email: 'x@privaterelay.appleid.com' });
  });

  it('should reject with 401 when the apple email is not verified', async () => {
    vi.spyOn(appleSigninAuth, 'verifyIdToken').mockResolvedValue({
      sub: 'a-1',
      email: 'victim@example.com',
      email_verified: 'false',
    } as never);

    await expect(
      new DefaultSocialIdTokenVerifier().verifyIdTokenSV('apple', 'id-token'),
    ).rejects.toMatchObject({ code: 'TOKEN_INVALIDO', statusCode: 401 });
  });
});

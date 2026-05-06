import { OAuth2Client } from 'google-auth-library';
import appleSigninAuth from 'apple-signin-auth';

import { AppError } from '../../domain/errors/app_error.js';
import type {
  SocialIdTokenClaimsDTO,
  SocialIdTokenVerifier,
  SocialProvider,
} from '../../domain/ports/social_id_token_verifier.js';
import { ENV_CONST } from '../../config/env.js';

function requireEnvSV(_value: string | undefined, _key: string): string {
  if (_value === undefined || _value.trim() === '') {
    throw new AppError(
      'CONFIG_INVALIDA',
      `Configuración faltante: ${_key}.`,
      500,
    );
  }
  return _value;
}

function normalizeEmailSV(_email: unknown): string {
  if (typeof _email !== 'string') {
    throw new AppError('TOKEN_INVALIDO', 'Token inválido o expirado.', 401);
  }
  const EMAIL = _email.trim().toLowerCase();
  if (EMAIL === '') {
    throw new AppError('TOKEN_INVALIDO', 'Token inválido o expirado.', 401);
  }
  return EMAIL;
}

export class DefaultSocialIdTokenVerifier implements SocialIdTokenVerifier {
  private readonly _googleClient: OAuth2Client;

  public constructor() {
    this._googleClient = new OAuth2Client();
  }

  async verifyIdTokenSV(_provider: SocialProvider, _idToken: string): Promise<SocialIdTokenClaimsDTO> {
    if (_idToken.trim() === '') {
      throw new AppError('VALIDACION_FALLIDA', 'idToken es obligatorio.', 400);
    }

    if (_provider === 'google') {
      const CLIENT_ID = requireEnvSV(ENV_CONST.GOOGLE_OAUTH_CLIENT_ID, 'GOOGLE_OAUTH_CLIENT_ID');
      const TICKET = await this._googleClient.verifyIdToken({
        idToken: _idToken,
        audience: CLIENT_ID,
      });
      const PAYLOAD = TICKET.getPayload();
      if (PAYLOAD === undefined || PAYLOAD.sub === undefined) {
        throw new AppError('TOKEN_INVALIDO', 'Token inválido o expirado.', 401);
      }
      const EMAIL = normalizeEmailSV(PAYLOAD.email);
      return {
        providerUserId: PAYLOAD.sub,
        email: EMAIL,
        ...(typeof PAYLOAD.name === 'string' && PAYLOAD.name.trim() !== '' ? { name: PAYLOAD.name } : {}),
      };
    }

    if (_provider === 'apple') {
      const AUDIENCE = requireEnvSV(ENV_CONST.APPLE_SIGNIN_AUDIENCE, 'APPLE_SIGNIN_AUDIENCE');
      let CLAIMS: unknown;
      try {
        CLAIMS = await appleSigninAuth.verifyIdToken(_idToken, {
          audience: AUDIENCE,
          ignoreExpiration: false,
        });
      } catch (_error) {
        throw new AppError('TOKEN_INVALIDO', 'Token inválido o expirado.', 401, { provider: 'apple' });
      }

      if (typeof CLAIMS !== 'object' || CLAIMS === null) {
        throw new AppError('TOKEN_INVALIDO', 'Token inválido o expirado.', 401);
      }

      const SUB = (CLAIMS as { sub?: unknown }).sub;
      const EMAIL_RAW = (CLAIMS as { email?: unknown }).email;
      if (typeof SUB !== 'string' || SUB.trim() === '') {
        throw new AppError('TOKEN_INVALIDO', 'Token inválido o expirado.', 401);
      }

      const EMAIL = normalizeEmailSV(EMAIL_RAW);
      return { providerUserId: SUB, email: EMAIL };
    }

    // Exhaustive guard.
    throw new AppError('VALIDACION_FALLIDA', 'Proveedor social inválido.', 400);
  }
}


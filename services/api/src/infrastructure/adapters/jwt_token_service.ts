import { JsonWebTokenError } from 'jsonwebtoken';

import type {
  AccessTokenPayloadDTO,
  RefreshTokenPayloadDTO,
  TokenService,
} from '../../domain/ports/token_service.js';

import {
  ACCESS_TOKEN_EXPIRES_IN_SECONDS,
  REFRESH_TOKEN_EXPIRES_IN_SECONDS,
  signAccessTokenSV,
  signRefreshTokenSV,
  verifyAccessTokenSV,
  verifyRefreshTokenSV,
} from '../jwt_tokens.js';

export class JwtTokenService implements TokenService {
  getAccessTokenExpiresInSecondsSV(): number {
    return ACCESS_TOKEN_EXPIRES_IN_SECONDS;
  }

  getRefreshTokenExpiresInSecondsSV(): number {
    return REFRESH_TOKEN_EXPIRES_IN_SECONDS;
  }

  signAccessTokenSV(_userId: string, _email: string): string {
    return signAccessTokenSV(_userId, _email);
  }

  signRefreshTokenSV(_userId: string, _jti: string): string {
    return signRefreshTokenSV(_userId, _jti);
  }

  verifyAccessTokenSV(_token: string): AccessTokenPayloadDTO {
    try {
      const PAYLOAD = verifyAccessTokenSV(_token);
      return { sub: PAYLOAD.sub, email: PAYLOAD.email };
    } catch (_error) {
      if (_error instanceof JsonWebTokenError) {
        throw new Error('TOKEN_INVALIDO', { cause: _error });
      }
      throw _error;
    }
  }

  verifyRefreshTokenSV(_token: string): RefreshTokenPayloadDTO {
    try {
      const PAYLOAD = verifyRefreshTokenSV(_token);
      return { sub: PAYLOAD.sub, jti: PAYLOAD.jti };
    } catch (_error) {
      if (_error instanceof JsonWebTokenError) {
        throw new Error('TOKEN_INVALIDO', { cause: _error });
      }
      throw _error;
    }
  }
}


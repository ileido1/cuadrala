import jwt from 'jsonwebtoken';

import { ENV_CONST } from '../config/env.js';

const ACCESS_EXPIRES_IN = '15m';
const REFRESH_EXPIRES_IN = '7d';

/** Segundos del access token (15 min) para el cliente. */
export const ACCESS_TOKEN_EXPIRES_IN_SECONDS = 15 * 60;
/** Segundos del refresh token (7 días) para persistencia/cliente. */
export const REFRESH_TOKEN_EXPIRES_IN_SECONDS = 7 * 24 * 60 * 60;

interface AccessTokenPayload {
  sub: string;
  email: string;
  typ: 'access';
}

interface RefreshTokenPayload {
  sub: string;
  typ: 'refresh';
  jti: string;
}

export function signAccessTokenSV(_userId: string, _email: string): string {
  const PAYLOAD: AccessTokenPayload = { sub: _userId, email: _email, typ: 'access' };
  return jwt.sign(PAYLOAD, ENV_CONST.JWT_ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES_IN });
}

export function signRefreshTokenSV(_userId: string, _jti: string): string {
  const PAYLOAD: RefreshTokenPayload = { sub: _userId, typ: 'refresh', jti: _jti };
  return jwt.sign(PAYLOAD, ENV_CONST.JWT_REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES_IN });
}

export function verifyAccessTokenSV(_token: string): AccessTokenPayload {
  const DECODED = jwt.verify(_token, ENV_CONST.JWT_ACCESS_SECRET);
  if (typeof DECODED === 'string' || DECODED.typ !== 'access') {
    throw new Error('TOKEN_INVALIDO');
  }
  return DECODED as AccessTokenPayload;
}

export function verifyRefreshTokenSV(_token: string): RefreshTokenPayload {
  const DECODED = jwt.verify(_token, ENV_CONST.JWT_REFRESH_SECRET);
  if (typeof DECODED === 'string' || DECODED.typ !== 'refresh' || typeof DECODED.jti !== 'string') {
    throw new Error('TOKEN_INVALIDO');
  }
  return DECODED as RefreshTokenPayload;
}

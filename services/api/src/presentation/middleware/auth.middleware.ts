import type { NextFunction, Request, Response } from 'express';
import { JsonWebTokenError } from 'jsonwebtoken';

import { AppError } from '../../domain/errors/app_error.js';
import { AUTH_TOKEN_SERVICE } from '../composition/auth.composition.js';

export function requireAuth(_req: Request, _res: Response, _next: NextFunction): void {
  try {
    const HEADER = _req.headers.authorization;
    if (HEADER === undefined || !HEADER.startsWith('Bearer ')) {
      throw new AppError('NO_AUTORIZADO', 'Se requiere un token de acceso.', 401);
    }
    const TOKEN = HEADER.slice(7);
    const PAYLOAD = AUTH_TOKEN_SERVICE.verifyAccessTokenSV(TOKEN);
    _req.authUser = { id: PAYLOAD.sub, email: PAYLOAD.email };
    _next();
  } catch (_error) {
    if (_error instanceof AppError) {
      _next(_error);
      return;
    }
    if (_error instanceof JsonWebTokenError) {
      _next(new AppError('TOKEN_INVALIDO', 'Token invalido o expirado.', 401));
      return;
    }
    if (_error instanceof Error && _error.message === 'TOKEN_INVALIDO') {
      _next(new AppError('TOKEN_INVALIDO', 'Token invalido o expirado.', 401));
      return;
    }
    _next(_error);
  }
}

/**
 * Autenticación opcional: si hay un Bearer token válido, lo resuelve y setea
 * `_req.authUser`; si no hay token (o es inválido/expirado), continúa sin
 * usuario. Nunca rechaza la request. Útil para endpoints que asignan el actor
 * (p. ej. `organizerUserId` al crear un torneo) sin exigir sesión obligatoria.
 */
export function optionalAuth(_req: Request, _res: Response, _next: NextFunction): void {
  const HEADER = _req.headers.authorization;
  if (HEADER === undefined || !HEADER.startsWith('Bearer ')) {
    _next();
    return;
  }
  try {
    const TOKEN = HEADER.slice(7);
    const PAYLOAD = AUTH_TOKEN_SERVICE.verifyAccessTokenSV(TOKEN);
    _req.authUser = { id: PAYLOAD.sub, email: PAYLOAD.email };
  } catch {
    // Token inválido o expirado: se ignora y la request continúa sin usuario.
  }
  _next();
}

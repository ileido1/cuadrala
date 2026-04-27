import type { NextFunction, Request, Response } from 'express';
import { JsonWebTokenError } from 'jsonwebtoken';

import { AppError } from '../../domain/errors/app_error.js';
import { verifyAccessTokenSV } from '../../infrastructure/jwt_tokens.js';

export function requireAuth(_req: Request, _res: Response, _next: NextFunction): void {
  try {
    const HEADER = _req.headers.authorization;
    if (HEADER === undefined || !HEADER.startsWith('Bearer ')) {
      throw new AppError('NO_AUTORIZADO', 'Se requiere un token de acceso.', 401);
    }
    const TOKEN = HEADER.slice(7);
    const PAYLOAD = verifyAccessTokenSV(TOKEN);
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

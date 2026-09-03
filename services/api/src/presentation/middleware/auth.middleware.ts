import { createHash, timingSafeEqual } from 'node:crypto';

import type { NextFunction, Request, Response } from 'express';
//? `jsonwebtoken` es CommonJS: bajo ESM sus named exports no se resuelven
//? estaticamente. Import por default + destructuring es la forma que si anda.
import jsonwebtoken from 'jsonwebtoken';

const { JsonWebTokenError } = jsonwebtoken;

import { AppError } from '../../domain/errors/app_error.js';
import { AUTH_TOKEN_SERVICE } from '../composition/auth.composition.js';

/**
 * @name    :sha256SV
 * @version :1.0.0
 * @description :Digest sha256 de un texto, para comparar secretos de largo fijo.
 * @param {string} _value - Texto a hashear
 * @return {Buffer} Digest de 32 bytes
 */
function sha256SV(_value: string): Buffer {
  return createHash('sha256').update(_value, 'utf8').digest();
}

/**
 * @name    :requireAuth
 * @version :1.0.0
 * @description :Exige un Bearer token válido y deja el usuario en `_req.authUser`.
 * Rechaza la request si falta el header, si el token no verifica o si expiró.
 * @param {Request} _req - Request de Express
 * @param {Response} _res - Response de Express
 * @param {NextFunction} _next - Siguiente middleware
 * @return {void}
 */
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
    //? El servicio de tokens puede fallar de tres formas distintas; todas se
    //? traducen a 401 para no filtrarle al cliente qué falló exactamente.
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
 * @name    :requireSecret
 * @version :1.0.0
 * @description :Autenticación por secreto compartido para endpoints de operación
 * (dispatch de notificaciones, mantenimiento, admin, geocoding). No hay usuario
 * detrás: solo un header con el secreto esperado.
 *
 * Vive como middleware —y no dentro del controller— para que la protección de
 * cada ruta se lea en el router, junto a la ruta que protege.
 * @param {string} _headerName - Header que transporta el secreto
 * @param {string} _expectedSecret - Secreto esperado, tomado del entorno
 * @return {Function} Middleware de Express que responde 401 si no coincide
 */
export function requireSecret(
  _headerName: string,
  _expectedSecret: string,
): (_req: Request, _res: Response, _next: NextFunction) => void {
  return function requireSecretMid(_req: Request, _res: Response, _next: NextFunction): void {
    const PROVIDED = _req.header(_headerName);
    //? Fail-closed: hoy `env.ts` garantiza un secreto no vacío, pero si esa
    //? garantía se aflojara, un secreto vacío dejaría pasar cualquier request.
    if (_expectedSecret === '' || PROVIDED === undefined) {
      _next(new AppError('NO_AUTORIZADO', 'Secret invalido.', 401));
      return;
    }
    //? Comparación de tiempo constante sobre hashes: `!==` corta en el primer
    //? byte distinto, y hashear primero evita filtrar el largo del secreto.
    const MATCHES = timingSafeEqual(sha256SV(PROVIDED), sha256SV(_expectedSecret));
    if (!MATCHES) {
      _next(new AppError('NO_AUTORIZADO', 'Secret invalido.', 401));
      return;
    }
    _next();
  };
}

/**
 * @name    :optionalAuth
 * @version :1.0.0
 * @description :Autenticación opcional: si hay un Bearer token válido, lo
 * resuelve y setea `_req.authUser`; si no hay token (o es inválido/expirado),
 * continúa sin usuario. Nunca rechaza la request. Útil para endpoints que
 * asignan el actor (p. ej. `organizerUserId` al crear un torneo) sin exigir
 * sesión obligatoria.
 * @param {Request} _req - Request de Express
 * @param {Response} _res - Response de Express
 * @param {NextFunction} _next - Siguiente middleware
 * @return {void}
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

import type { Request } from 'express';

import { AppError } from '../../domain/errors/app_error.js';

/**
 * @name    :requireActorUserIdSV
 * @version :1.0.0
 * @description :Devuelve el id del usuario autenticado. `requireAuth` ya corrio
 * en el router, asi que faltar aca seria un error de cableado, no del cliente.
 * @param {Request} _req - Request de Express
 * @return {string} Id del usuario que hace la request
 * @throws {AppError} 401 si no hay sesion en la request
 */
export function requireActorUserIdSV(_req: Request): string {
  const ACTOR_USER_ID = _req.authUser?.id;
  if (ACTOR_USER_ID === undefined) {
    throw new AppError('NO_AUTORIZADO', 'Sesion no disponible.', 401);
  }
  return ACTOR_USER_ID;
}

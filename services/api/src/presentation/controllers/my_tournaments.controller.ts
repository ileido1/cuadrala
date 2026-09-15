import type { Request, Response } from 'express';

import { AppError } from '../../domain/errors/app_error.js';
import { LIST_MY_TOURNAMENTS_UC } from '../composition/profile.composition.js';

/**
 * @name    :getMyTournamentsCON
 * @version :1.0.0
 * @description :Devuelve los torneos del usuario actual: en los que esta
 * inscripto, invitado, o que organiza.
 * @param {Request} _req - Request de Express
 * @param {Response} _res - Response de Express
 * @return {Promise<void>}
 */
export async function getMyTournamentsCON(_req: Request, _res: Response): Promise<void> {
  const USER_ID = _req.authUser?.id;
  if (USER_ID === undefined) {
    throw new AppError('NO_AUTORIZADO', 'Sesion no disponible.', 401);
  }

  const RESULT = await LIST_MY_TOURNAMENTS_UC.executeSV({ actorUserId: USER_ID });

  _res.status(200).json({
    success: true,
    message: 'Torneos obtenidos correctamente.',
    data: RESULT,
  });
}

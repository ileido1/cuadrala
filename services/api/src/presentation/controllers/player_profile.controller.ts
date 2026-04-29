import type { Request, Response } from 'express';

import { AppError } from '../../domain/errors/app_error.js';
import {
  GET_PLAYER_PROFILE_UC,
  GET_USER_STATS_UC,
  UPDATE_PLAYER_PROFILE_UC,
} from '../composition/profile.composition.js';
import { USER_ID_PARAM_SCHEMA, UPDATE_PLAYER_PROFILE_BODY_SCHEMA } from '../validation/player_profile.validation.js';

export async function getMyPlayerProfileCON(_req: Request, _res: Response): Promise<void> {
  const USER_ID = _req.authUser?.id;
  if (USER_ID === undefined) {
    throw new AppError('NO_AUTORIZADO', 'Sesion no disponible.', 401);
  }

  const PROFILE = await GET_PLAYER_PROFILE_UC.executeSV(USER_ID);

  _res.status(200).json({
    success: true,
    message: 'Perfil técnico obtenido correctamente.',
    data: { profile: PROFILE },
  });
}

export async function patchMyPlayerProfileCON(_req: Request, _res: Response): Promise<void> {
  const USER_ID = _req.authUser?.id;
  if (USER_ID === undefined) {
    throw new AppError('NO_AUTORIZADO', 'Sesion no disponible.', 401);
  }

  const BODY = UPDATE_PLAYER_PROFILE_BODY_SCHEMA.parse(_req.body);
  const UPDATED = await UPDATE_PLAYER_PROFILE_UC.executeSV(USER_ID, BODY);

  _res.status(200).json({
    success: true,
    message: 'Perfil técnico actualizado correctamente.',
    data: { profile: UPDATED },
  });
}

export async function getUserStatsCON(_req: Request, _res: Response): Promise<void> {
  const PARAMS = USER_ID_PARAM_SCHEMA.parse(_req.params);
  const STATS = await GET_USER_STATS_UC.executeSV(PARAMS.userId);

  _res.status(200).json({
    success: true,
    message: 'Estadísticas obtenidas correctamente.',
    data: STATS,
  });
}


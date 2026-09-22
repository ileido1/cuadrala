import type { Request, Response } from 'express';

import { AppError } from '../../domain/errors/app_error.js';
import {
  CANCEL_MY_QUICK_MATCH_UC,
  GET_MY_QUICK_MATCH_UC,
  START_QUICK_MATCH_UC,
} from '../composition/quick_match.composition.js';
import { START_QUICK_MATCH_BODY_SCHEMA } from '../validation/quick_match.validation.js';

function actorUserIdSV(_req: Request): string {
  const USER_ID = _req.authUser?.id;
  if (USER_ID === undefined) throw new AppError('NO_AUTORIZADO', 'Sesion no disponible.', 401);
  return USER_ID;
}

export async function getMyQuickMatchCON(_req: Request, _res: Response): Promise<void> {
  const SEARCH = await GET_MY_QUICK_MATCH_UC.executeSV(actorUserIdSV(_req));
  _res.status(200).json({
    success: true,
    message: 'Estado de búsqueda obtenido correctamente.',
    data: SEARCH,
  });
}

export async function postQuickMatchCON(_req: Request, _res: Response): Promise<void> {
  const BODY = START_QUICK_MATCH_BODY_SCHEMA.parse(_req.body);
  const SEARCH = await START_QUICK_MATCH_UC.executeSV(actorUserIdSV(_req), BODY);
  _res.status(201).json({
    success: true,
    message: 'Búsqueda de partida iniciada correctamente.',
    data: SEARCH,
  });
}

export async function deleteMyQuickMatchCON(_req: Request, _res: Response): Promise<void> {
  await CANCEL_MY_QUICK_MATCH_UC.executeSV(actorUserIdSV(_req));
  _res.status(204).send();
}

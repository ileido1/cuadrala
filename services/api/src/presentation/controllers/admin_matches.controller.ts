import type { Request, Response } from 'express';

import { AppError } from '../../domain/errors/app_error.js';
import { ENV_CONST } from '../../config/env.js';
import {
  ADMIN_MATCH_CRUD_REPOSITORY,
  ADMIN_MATCH_QUERY_REPOSITORY,
} from '../composition/admin_matches.composition.js';

function requireAdminSecretSV(_req: Request): void {
  const SECRET = _req.header('x-admin-secret');
  if (SECRET === undefined || SECRET !== ENV_CONST.ADMIN_DISPATCH_SECRET) {
    throw new AppError('NO_AUTORIZADO', 'Secret invalido.', 401);
  }
}

export async function patchAdminCancelMatchCON(_req: Request, _res: Response): Promise<void> {
  requireAdminSecretSV(_req);
  const MATCH_ID = _req.params?.matchId as string | undefined;
  if (!MATCH_ID) {
    throw new AppError('VALIDACION_FALLIDA', 'matchId es requerido.', 400);
  }

  const MATCH = await ADMIN_MATCH_QUERY_REPOSITORY.getMatchByIdSV(MATCH_ID);
  if (MATCH === null) {
    throw new AppError('PARTIDO_NO_ENCONTRADO', 'El partido indicado no existe.', 404);
  }
  if (MATCH.status !== 'SCHEDULED' && MATCH.status !== 'IN_PROGRESS') {
    throw new AppError('PARTIDO_NO_CANCELABLE', 'No se puede cancelar el partido en su estado actual.', 409);
  }

  const RESULT = await ADMIN_MATCH_CRUD_REPOSITORY.cancelMatchSV(MATCH_ID);
  _res.status(200).json({
    success: true,
    message: 'Partido cancelado correctamente.',
    data: { match: RESULT },
  });
}


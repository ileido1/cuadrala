import type { Request, Response } from 'express';

import { AppError } from '../../domain/errors/app_error.js';
import {
  GENERATE_TOURNAMENT_SCHEDULE_UC,
  GET_TOURNAMENT_SCHEDULE_UC,
} from '../composition/tournament_schedule.composition.js';
import {
  GENERATE_TOURNAMENT_SCHEDULE_BODY_SCHEMA,
  TOURNAMENT_ID_PARAM_SCHEMA,
} from '../validation/tournament_schedule.validation.js';

export async function postGenerateTournamentScheduleCON(_req: Request, _res: Response): Promise<void> {
  const ACTOR_USER_ID = _req.authUser?.id;
  if (ACTOR_USER_ID === undefined) {
    throw new AppError('NO_AUTORIZADO', 'Sesion no disponible.', 401);
  }

  const PARAMS = TOURNAMENT_ID_PARAM_SCHEMA.parse(_req.params);
  const BODY = GENERATE_TOURNAMENT_SCHEDULE_BODY_SCHEMA.parse(_req.body);

  const RESULT = await GENERATE_TOURNAMENT_SCHEDULE_UC.executeSV({
    tournamentId: PARAMS.tournamentId,
    actorUserId: ACTOR_USER_ID,
    ...(BODY.doubleRound !== undefined ? { doubleRound: BODY.doubleRound } : {}),
    ...(BODY.thirdPlaceMatch !== undefined ? { thirdPlaceMatch: BODY.thirdPlaceMatch } : {}),
  });

  _res.status(201).json({
    success: true,
    message: 'Calendario generado correctamente.',
    data: RESULT,
  });
}

export async function getTournamentScheduleCON(_req: Request, _res: Response): Promise<void> {
  const PARAMS = TOURNAMENT_ID_PARAM_SCHEMA.parse(_req.params);
  const RESULT = await GET_TOURNAMENT_SCHEDULE_UC.executeSV(PARAMS.tournamentId);

  _res.status(200).json({
    success: true,
    message: 'Calendario obtenido correctamente.',
    data: RESULT,
  });
}


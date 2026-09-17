import type { Request, Response } from 'express';

import { AppError } from '../../domain/errors/app_error.js';
import {
  GET_TOURNAMENT_UC,
  LIST_TOURNAMENTS_UC,
  LIST_TOURNAMENTS_BY_VENUE_UC,
  UPDATE_TOURNAMENT_STATUS_UC,
  UPDATE_TOURNAMENT_VISIBILITY_UC,
  UPDATE_TOURNAMENT_SETTINGS_UC,
} from '../composition/tournaments.composition.js';
import {
  LIST_TOURNAMENTS_QUERY_SCHEMA,
  TOURNAMENT_ID_PARAM_SCHEMA,
  VENUE_ID_PARAM_SCHEMA,
  LIST_TOURNAMENTS_BY_VENUE_QUERY_SCHEMA,
  UPDATE_TOURNAMENT_STATUS_BODY_SCHEMA,
  UPDATE_TOURNAMENT_VISIBILITY_BODY_SCHEMA,
  UPDATE_TOURNAMENT_SETTINGS_BODY_SCHEMA,
} from '../validation/tournaments.validation.js';

export async function getListTournamentsCON(_req: Request, _res: Response): Promise<void> {
  const QUERY = LIST_TOURNAMENTS_QUERY_SCHEMA.parse(_req.query);

  const RESULT = await LIST_TOURNAMENTS_UC.executeSV({
    page: QUERY.page,
    limit: QUERY.limit,
    ...(QUERY.status !== undefined ? { status: QUERY.status } : {}),
    ...(QUERY.sportId !== undefined ? { sportId: QUERY.sportId } : {}),
    ...(QUERY.categoryId !== undefined ? { categoryId: QUERY.categoryId } : {}),
    ...(QUERY.venueId !== undefined ? { venueId: QUERY.venueId } : {}),
    ...(QUERY.startsAtFrom !== undefined ? { startsAtFrom: QUERY.startsAtFrom } : {}),
    ...(QUERY.startsAtTo !== undefined ? { startsAtTo: QUERY.startsAtTo } : {}),
    ...(QUERY.near !== undefined ? { near: QUERY.near } : {}),
    ...(QUERY.radiusKm !== undefined ? { radiusKm: QUERY.radiusKm } : {}),
  });

  _res.status(200).json({
    success: true,
    message: 'Torneos obtenidos correctamente.',
    data: RESULT,
  });
}

export async function getTournamentByIdCON(_req: Request, _res: Response): Promise<void> {
  const PARAMS = TOURNAMENT_ID_PARAM_SCHEMA.parse(_req.params);

  const RESULT = await GET_TOURNAMENT_UC.executeSV(PARAMS.tournamentId);

  _res.status(200).json({
    success: true,
    message: 'Torneo obtenido correctamente.',
    data: RESULT,
  });
}

export async function getTournamentsByVenueCON(_req: Request, _res: Response): Promise<void> {
  const PARAMS = VENUE_ID_PARAM_SCHEMA.parse(_req.params);
  const QUERY = LIST_TOURNAMENTS_BY_VENUE_QUERY_SCHEMA.parse(_req.query);

  const RESULT = await LIST_TOURNAMENTS_BY_VENUE_UC.executeSV({
    venueId: PARAMS.venueId,
    page: QUERY.page,
    limit: QUERY.limit,
    ...(QUERY.status !== undefined ? { status: QUERY.status } : {}),
    ...(QUERY.sportId !== undefined ? { sportId: QUERY.sportId } : {}),
    ...(QUERY.categoryId !== undefined ? { categoryId: QUERY.categoryId } : {}),
  });

  _res.status(200).json({
    success: true,
    message: 'Torneos de la sede obtenidos correctamente.',
    data: RESULT,
  });
}

export async function patchTournamentStatusCON(_req: Request, _res: Response): Promise<void> {
  const ACTOR_USER_ID = _req.authUser?.id;
  if (ACTOR_USER_ID === undefined) {
    throw new AppError('NO_AUTORIZADO', 'Sesion no disponible.', 401);
  }

  const PARAMS = TOURNAMENT_ID_PARAM_SCHEMA.parse(_req.params);
  const BODY = UPDATE_TOURNAMENT_STATUS_BODY_SCHEMA.parse(_req.body);

  const UPDATED = await UPDATE_TOURNAMENT_STATUS_UC.executeSV({
    tournamentId: PARAMS.tournamentId,
    status: BODY.status,
    actorUserId: ACTOR_USER_ID,
  });

  _res.status(200).json({
    success: true,
    message: 'Estado del torneo actualizado correctamente.',
    data: UPDATED,
  });
}

export async function patchTournamentVisibilityCON(_req: Request, _res: Response): Promise<void> {
  const ACTOR_USER_ID = _req.authUser?.id;
  if (ACTOR_USER_ID === undefined) {
    throw new AppError('NO_AUTORIZADO', 'Sesion no disponible.', 401);
  }

  const PARAMS = TOURNAMENT_ID_PARAM_SCHEMA.parse(_req.params);
  const BODY = UPDATE_TOURNAMENT_VISIBILITY_BODY_SCHEMA.parse(_req.body);

  const UPDATED = await UPDATE_TOURNAMENT_VISIBILITY_UC.executeSV({
    tournamentId: PARAMS.tournamentId,
    visibility: BODY.visibility,
    actorUserId: ACTOR_USER_ID,
  });

  _res.status(200).json({
    success: true,
    message: 'Visibilidad del torneo actualizada correctamente.',
    data: UPDATED,
  });
}

export async function patchTournamentSettingsCON(_req: Request, _res: Response): Promise<void> {
  const ACTOR_USER_ID = _req.authUser?.id;
  if (ACTOR_USER_ID === undefined)
    throw new AppError('NO_AUTORIZADO', 'Sesion no disponible.', 401);
  const PARAMS = TOURNAMENT_ID_PARAM_SCHEMA.parse(_req.params);
  const BODY = UPDATE_TOURNAMENT_SETTINGS_BODY_SCHEMA.parse(_req.body);
  const SETTINGS = {
    ...BODY,
    ...(BODY.startsAt !== undefined
      ? { startsAt: BODY.startsAt === null ? null : new Date(BODY.startsAt) }
      : {}),
    ...(BODY.endsAt !== undefined
      ? { endsAt: BODY.endsAt === null ? null : new Date(BODY.endsAt) }
      : {}),
    ...(BODY.registrationClosesAt !== undefined
      ? {
          registrationClosesAt:
            BODY.registrationClosesAt === null ? null : new Date(BODY.registrationClosesAt),
        }
      : {}),
  };
  const UPDATED = await UPDATE_TOURNAMENT_SETTINGS_UC.executeSV({
    tournamentId: PARAMS.tournamentId,
    actorUserId: ACTOR_USER_ID,
    settings: SETTINGS,
  });
  _res
    .status(200)
    .json({
      success: true,
      message: 'Configuración del torneo actualizada correctamente.',
      data: UPDATED,
    });
}

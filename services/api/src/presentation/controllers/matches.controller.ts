import type { Request, Response } from 'express';

import { AppError } from '../../domain/errors/app_error.js';
import {
  CANCEL_MATCH_UC,
  CREATE_MATCH_UC,
  GET_MATCH_UC,
  JOIN_MATCH_UC,
  LIST_MATCHES_UC,
  LIST_OPEN_MATCHES_UC,
  UPDATE_MATCH_UC,
} from '../composition/matches.composition.js';
import {
  CREATE_MATCH_BODY_SCHEMA,
  LIST_OPEN_MATCHES_QUERY_SCHEMA,
  LIST_MATCHES_QUERY_SCHEMA,
  MATCH_ID_PARAM_SCHEMA,
  UPDATE_MATCH_BODY_SCHEMA,
} from '../validation/matches.validation.js';

export async function getOpenMatchesCON(_req: Request, _res: Response): Promise<void> {
  const QUERY = LIST_OPEN_MATCHES_QUERY_SCHEMA.parse(_req.query);

  const RESULT = await LIST_OPEN_MATCHES_UC.executeSV({
    sportId: QUERY.sportId,
    page: QUERY.page,
    limit: QUERY.limit,
    ...(QUERY.categoryId !== undefined ? { categoryId: QUERY.categoryId } : {}),
    ...(QUERY.scheduledFrom !== undefined ? { scheduledFrom: new Date(QUERY.scheduledFrom) } : {}),
    ...(QUERY.scheduledTo !== undefined ? { scheduledTo: new Date(QUERY.scheduledTo) } : {}),
  });

  _res.status(200).json({
    success: true,
    message: 'Partidas obtenidas correctamente.',
    data: RESULT,
  });
}

export async function getMatchesCON(_req: Request, _res: Response): Promise<void> {
  const QUERY = LIST_MATCHES_QUERY_SCHEMA.parse(_req.query);

  const RESULT = await LIST_MATCHES_UC.executeSV({
    page: QUERY.page,
    limit: QUERY.limit,
    ...(QUERY.sportId !== undefined ? { sportId: QUERY.sportId } : {}),
    ...(QUERY.categoryId !== undefined ? { categoryId: QUERY.categoryId } : {}),
    ...(QUERY.status !== undefined ? { status: QUERY.status } : {}),
    ...(QUERY.scheduledFrom !== undefined ? { scheduledFrom: new Date(QUERY.scheduledFrom) } : {}),
    ...(QUERY.scheduledTo !== undefined ? { scheduledTo: new Date(QUERY.scheduledTo) } : {}),
  });

  _res.status(200).json({
    success: true,
    message: 'Partidos obtenidos correctamente.',
    data: RESULT,
  });
}

export async function getMatchByIdCON(_req: Request, _res: Response): Promise<void> {
  const PARAMS = MATCH_ID_PARAM_SCHEMA.parse(_req.params);
  const RESULT = await GET_MATCH_UC.executeSV(PARAMS.matchId);

  _res.status(200).json({
    success: true,
    message: 'Partido obtenido correctamente.',
    data: RESULT,
  });
}

export async function postCreateMatchCON(_req: Request, _res: Response): Promise<void> {
  const USER_ID = _req.authUser?.id;
  if (USER_ID === undefined) {
    throw new AppError('NO_AUTORIZADO', 'Sesion no disponible.', 401);
  }

  const BODY = CREATE_MATCH_BODY_SCHEMA.parse(_req.body);

  const RESULT = await CREATE_MATCH_UC.executeSV({
    creatorUserId: USER_ID,
    sportId: BODY.sportId,
    categoryId: BODY.categoryId,
    ...(BODY.type !== undefined ? { type: BODY.type } : {}),
    ...(BODY.scheduledAt !== undefined ? { scheduledAt: new Date(BODY.scheduledAt) } : {}),
    ...(BODY.courtId !== undefined ? { courtId: BODY.courtId } : {}),
    ...(BODY.tournamentId !== undefined ? { tournamentId: BODY.tournamentId } : {}),
    ...(BODY.maxParticipants !== undefined ? { maxParticipants: BODY.maxParticipants } : {}),
  });

  _res.status(201).json({
    success: true,
    message: 'Partido creado correctamente.',
    data: RESULT,
  });
}

export async function patchUpdateMatchCON(_req: Request, _res: Response): Promise<void> {
  const USER_ID = _req.authUser?.id;
  if (USER_ID === undefined) {
    throw new AppError('NO_AUTORIZADO', 'Sesion no disponible.', 401);
  }

  const PARAMS = MATCH_ID_PARAM_SCHEMA.parse(_req.params);
  const BODY = UPDATE_MATCH_BODY_SCHEMA.parse(_req.body);

  const RESULT = await UPDATE_MATCH_UC.executeSV({
    matchId: PARAMS.matchId,
    actorUserId: USER_ID,
    ...(BODY.scheduledAt !== undefined ? { scheduledAt: BODY.scheduledAt === null ? null : new Date(BODY.scheduledAt) } : {}),
    ...(BODY.courtId !== undefined ? { courtId: BODY.courtId } : {}),
    ...(BODY.maxParticipants !== undefined ? { maxParticipants: BODY.maxParticipants } : {}),
  });

  _res.status(200).json({
    success: true,
    message: 'Partido actualizado correctamente.',
    data: RESULT,
  });
}

export async function patchCancelMatchCON(_req: Request, _res: Response): Promise<void> {
  const USER_ID = _req.authUser?.id;
  if (USER_ID === undefined) {
    throw new AppError('NO_AUTORIZADO', 'Sesion no disponible.', 401);
  }

  const PARAMS = MATCH_ID_PARAM_SCHEMA.parse(_req.params);
  const RESULT = await CANCEL_MATCH_UC.executeSV(PARAMS.matchId, USER_ID);

  _res.status(200).json({
    success: true,
    message: 'Partido cancelado correctamente.',
    data: RESULT,
  });
}

export async function postJoinMatchCON(_req: Request, _res: Response): Promise<void> {
  const USER_ID = _req.authUser?.id;
  if (USER_ID === undefined) {
    throw new AppError('NO_AUTORIZADO', 'Sesion no disponible.', 401);
  }

  const PARAMS = MATCH_ID_PARAM_SCHEMA.parse(_req.params);
  const RESULT = await JOIN_MATCH_UC.executeSV(PARAMS.matchId, USER_ID);

  _res.status(200).json({
    success: true,
    message: 'Te uniste al partido correctamente.',
    data: RESULT,
  });
}


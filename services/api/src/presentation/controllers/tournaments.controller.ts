import type { Request, Response } from 'express';

import { AppError } from '../../domain/errors/app_error.js';
import { GET_TOURNAMENT_UC, LIST_TOURNAMENTS_UC } from '../composition/tournaments.composition.js';
import { LIST_TOURNAMENTS_QUERY_SCHEMA, TOURNAMENT_ID_PARAM_SCHEMA } from '../validation/tournaments.validation.js';

export async function getListTournamentsCON(_req: Request, _res: Response): Promise<void> {
  const QUERY = LIST_TOURNAMENTS_QUERY_SCHEMA.parse(_req.query);

  const RESULT = await LIST_TOURNAMENTS_UC.executeSV({
    page: QUERY.page,
    limit: QUERY.limit,
    ...(QUERY.status !== undefined ? { status: QUERY.status } : {}),
    ...(QUERY.sportId !== undefined ? { sportId: QUERY.sportId } : {}),
    ...(QUERY.categoryId !== undefined ? { categoryId: QUERY.categoryId } : {}),
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
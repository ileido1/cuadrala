import type { Request, Response } from 'express';

import { AppError } from '../../domain/errors/app_error.js';
import { GET_TOURNAMENT_BRACKET_UC } from '../composition/tournament_bracket.composition.js';
import { TOURNAMENT_ID_PARAM_SCHEMA } from '../validation/tournaments.validation.js';
import { MATCH_ID_PARAM_SCHEMA, SCORE_ENTRY_SCHEMA } from '../validation/tournament_bracket.validation.js';
import { REGISTER_TOURNAMENT_MATCH_RESULT_UC } from '../composition/tournament_bracket.composition.js';

export async function getTournamentBracketCON(_req: Request, _res: Response): Promise<void> {
  const PARAMS = TOURNAMENT_ID_PARAM_SCHEMA.parse(_req.params);

  const RESULT = await GET_TOURNAMENT_BRACKET_UC.executeSV({ tournamentId: PARAMS.tournamentId });

  _res.status(200).json({
    success: true,
    message: 'Bracket obtenido correctamente.',
    data: RESULT,
  });
}

export async function postTournamentMatchResultCON(_req: Request, _res: Response): Promise<void> {
  const PARAMS = TOURNAMENT_ID_PARAM_SCHEMA.parse(_req.params);
  const MATCH_PARAMS = MATCH_ID_PARAM_SCHEMA.parse(_req.params);
  const BODY = SCORE_ENTRY_SCHEMA.parse(_req.body);

  if (_req.authUser === undefined) {
    throw new AppError('NO_AUTORIZADO', 'Se requiere autenticación.', 401);
  }

  const RESULT = await REGISTER_TOURNAMENT_MATCH_RESULT_UC.executeSV({
    tournamentId: PARAMS.tournamentId,
    matchId: MATCH_PARAMS.matchId,
    matchNumber: 0, // No se usa actualmente pero se requiere en el input
    roundNumber: 0, // No se usa actualmente pero se requiere en el input
    scores: BODY.scores,
    requestingUserId: _req.authUser.id,
  });

  _res.status(201).json({
    success: true,
    message: 'Resultado registrado correctamente.',
    data: {
      resultId: RESULT.resultId,
      recordedAt: RESULT.recordedAt.toISOString(),
    },
  });
}

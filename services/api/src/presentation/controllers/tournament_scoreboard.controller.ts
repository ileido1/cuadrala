import type { Request, Response } from 'express';

import { GET_TOURNAMENT_SCOREBOARD_UC } from '../composition/tournament_scoreboard.composition.js';
import { TOURNAMENT_SCOREBOARD_TOURNAMENT_ID_PARAM_SCHEMA } from '../validation/tournament_scoreboard.validation.js';

export async function getTournamentScoreboardCON(_req: Request, _res: Response): Promise<void> {
  const PARAMS = TOURNAMENT_SCOREBOARD_TOURNAMENT_ID_PARAM_SCHEMA.parse(_req.params);
  const RESULT = await GET_TOURNAMENT_SCOREBOARD_UC.executeSV(PARAMS.tournamentId);

  _res.status(200).json({
    success: true,
    message: 'Scoreboard obtenido correctamente.',
    data: RESULT,
  });
}


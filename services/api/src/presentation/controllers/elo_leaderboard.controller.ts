import type { Request, Response } from 'express';

import { GET_ELO_LEADERBOARD_UC } from '../composition/elo_leaderboard.composition.js';
import { GET_ELO_LEADERBOARD_QUERY_SCHEMA } from '../validation/elo_leaderboard.validation.js';

export async function getEloLeaderboardCON(_req: Request, _res: Response): Promise<void> {
  const QUERY = GET_ELO_LEADERBOARD_QUERY_SCHEMA.parse(_req.query);
  const RESULT = await GET_ELO_LEADERBOARD_UC.executeSV({ categoryId: QUERY.categoryId, limit: QUERY.limit });

  _res.status(200).json({
    success: true,
    message: 'Leaderboard obtenido correctamente.',
    data: RESULT,
  });
}


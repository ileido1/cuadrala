import type { Request, Response } from 'express';

import { getMatchmakingSuggestionsSV } from '../../application/matchmaking.service.js';
import {
  MATCHMAKING_PARAMS_SCHEMA,
  MATCHMAKING_QUERY_SCHEMA,
} from '../validation/matchmaking.validation.js';

export async function getMatchmakingSuggestionsCON(_req: Request, _res: Response): Promise<void> {
  const PARAMS = MATCHMAKING_PARAMS_SCHEMA.parse(_req.params);
  const QUERY = MATCHMAKING_QUERY_SCHEMA.parse(_req.query);

  const SUGGESTIONS = await getMatchmakingSuggestionsSV(PARAMS.matchId, QUERY.limit);

  _res.status(200).json({
    success: true,
    message: 'Sugerencias obtenidas correctamente.',
    data: { suggestions: SUGGESTIONS },
  });
}

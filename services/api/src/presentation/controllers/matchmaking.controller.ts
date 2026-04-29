import type { Request, Response } from 'express';

import {
  MATCHMAKING_PARAMS_SCHEMA,
  MATCHMAKING_QUERY_SCHEMA,
} from '../validation/matchmaking.validation.js';
import {
  GET_MATCHMAKING_SUGGESTIONS_V2_UC,
  MATCHMAKING_DEFAULT_RADIUS_KM,
} from '../composition/matchmaking.composition.js';

export async function getMatchmakingSuggestionsCON(_req: Request, _res: Response): Promise<void> {
  const PARAMS = MATCHMAKING_PARAMS_SCHEMA.parse(_req.params);
  const QUERY = MATCHMAKING_QUERY_SCHEMA.parse(_req.query);

  const SUGGESTIONS = await GET_MATCHMAKING_SUGGESTIONS_V2_UC.executeSV({
    matchId: PARAMS.matchId,
    limit: QUERY.limit,
    radiusKm: QUERY.radiusKm,
    defaultRadiusKm: MATCHMAKING_DEFAULT_RADIUS_KM,
  });

  _res.status(200).json({
    success: true,
    message: 'Sugerencias obtenidas correctamente.',
    data: { suggestions: SUGGESTIONS },
  });
}

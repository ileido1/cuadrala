import { Router } from 'express';

import { getTournamentScoreboardCON } from '../controllers/tournament_scoreboard.controller.js';
import { asyncHandler } from '../middleware/async_handler.js';
import { optionalAuth } from '../middleware/auth.middleware.js';

export const TOURNAMENT_SCOREBOARD_ROUTER = Router();

//? Sin sesión obligatoria: un torneo PUBLIC sigue siendo visible para
//? cualquiera; `optionalAuth` resuelve `_req.authUser` cuando hay sesión,
//? para que el use case evalúe organizador/staff/participante en PRIVATE.
TOURNAMENT_SCOREBOARD_ROUTER.get(
  '/tournaments/:tournamentId/scoreboard',
  optionalAuth,
  asyncHandler(getTournamentScoreboardCON),
);


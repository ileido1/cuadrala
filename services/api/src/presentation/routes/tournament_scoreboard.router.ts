import { Router } from 'express';

import { getTournamentScoreboardCON } from '../controllers/tournament_scoreboard.controller.js';
import { asyncHandler } from '../middleware/async_handler.js';

export const TOURNAMENT_SCOREBOARD_ROUTER = Router();

TOURNAMENT_SCOREBOARD_ROUTER.get(
  '/tournaments/:tournamentId/scoreboard',
  asyncHandler(getTournamentScoreboardCON),
);


import { Router } from 'express';

import {
  getTournamentScheduleCON,
  postGenerateTournamentScheduleCON,
} from '../controllers/tournament_schedule.controller.js';
import { asyncHandler } from '../middleware/async_handler.js';
import { requireAuth } from '../middleware/auth.middleware.js';

export const TOURNAMENT_SCHEDULE_ROUTER = Router();

TOURNAMENT_SCHEDULE_ROUTER.post(
  '/tournaments/:tournamentId/schedule\\:generate',
  requireAuth,
  asyncHandler(postGenerateTournamentScheduleCON),
);

TOURNAMENT_SCHEDULE_ROUTER.get(
  '/tournaments/:tournamentId/schedule',
  asyncHandler(getTournamentScheduleCON),
);


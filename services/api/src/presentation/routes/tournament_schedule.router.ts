import { Router } from 'express';

import {
  getTournamentScheduleCON,
  postGenerateTournamentScheduleCON,
} from '../controllers/tournament_schedule.controller.js';
import { asyncHandler } from '../middleware/async_handler.js';

export const TOURNAMENT_SCHEDULE_ROUTER = Router();

TOURNAMENT_SCHEDULE_ROUTER.post(
  '/tournaments/:tournamentId/schedule\\:generate',
  asyncHandler(postGenerateTournamentScheduleCON),
);

TOURNAMENT_SCHEDULE_ROUTER.get(
  '/tournaments/:tournamentId/schedule',
  asyncHandler(getTournamentScheduleCON),
);


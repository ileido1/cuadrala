import { Router } from 'express';

import {
  getTournamentAmericanoScheduleCON,
  postGenerateTournamentAmericanoScheduleCON,
} from '../controllers/tournament_americano_schedule.controller.js';
import { asyncHandler } from '../middleware/async_handler.js';

export const TOURNAMENT_AMERICANO_SCHEDULE_ROUTER = Router();

TOURNAMENT_AMERICANO_SCHEDULE_ROUTER.post(
  '/tournaments/:tournamentId/americano-schedule:generate',
  asyncHandler(postGenerateTournamentAmericanoScheduleCON),
);

TOURNAMENT_AMERICANO_SCHEDULE_ROUTER.get(
  '/tournaments/:tournamentId/americano-schedule',
  asyncHandler(getTournamentAmericanoScheduleCON),
);

import { Router } from 'express';

import {
  getTournamentScheduleCON,
  postGenerateTournamentScheduleCON,
  postRespondTournamentSlotCON,
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


//? El guard de "solo quien juega ese partido" vive en el caso de uso porque
//? depende del cuadro, que el router no conoce.
TOURNAMENT_SCHEDULE_ROUTER.post(
  '/tournaments/:tournamentId/schedule/rounds/:roundNumber/matches/:matchNumber/respond',
  requireAuth,
  asyncHandler(postRespondTournamentSlotCON),
);

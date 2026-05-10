import { Router } from 'express';

import { getListTournamentsCON, getTournamentByIdCON } from '../controllers/tournaments.controller.js';
import { asyncHandler } from '../middleware/async_handler.js';
import { requireAuth } from '../middleware/auth.middleware.js';

export const TOURNAMENTS_ROUTER = Router();

TOURNAMENTS_ROUTER.get('/tournaments', asyncHandler(getListTournamentsCON));
TOURNAMENTS_ROUTER.get('/tournaments/:tournamentId', asyncHandler(getTournamentByIdCON));
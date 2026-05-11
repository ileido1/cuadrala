import { Router } from 'express';

import { getListTournamentsCON, getTournamentByIdCON, getTournamentsByVenueCON, patchTournamentStatusCON } from '../controllers/tournaments.controller.js';
import { getTournamentBracketCON, postTournamentMatchResultCON } from '../controllers/tournament_bracket.controller.js';
import { asyncHandler } from '../middleware/async_handler.js';
import { requireAuth } from '../middleware/auth.middleware.js';

export const TOURNAMENTS_ROUTER = Router();

TOURNAMENTS_ROUTER.get('/tournaments', asyncHandler(getListTournamentsCON));
TOURNAMENTS_ROUTER.get('/tournaments/venue/:venueId', requireAuth, asyncHandler(getTournamentsByVenueCON));
TOURNAMENTS_ROUTER.get('/tournaments/:tournamentId', asyncHandler(getTournamentByIdCON));
TOURNAMENTS_ROUTER.get('/tournaments/:tournamentId/bracket', requireAuth, asyncHandler(getTournamentBracketCON));
TOURNAMENTS_ROUTER.patch('/tournaments/:tournamentId/status', requireAuth, asyncHandler(patchTournamentStatusCON));
TOURNAMENTS_ROUTER.post('/tournaments/:tournamentId/matches/:matchId/results', requireAuth, asyncHandler(postTournamentMatchResultCON));
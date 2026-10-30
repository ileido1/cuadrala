import { Router } from 'express';

import { getListTournamentsCON, getTournamentByIdCON, getTournamentsByVenueCON, patchTournamentStatusCON, patchTournamentVisibilityCON, patchTournamentSettingsCON } from '../controllers/tournaments.controller.js';
import { getTournamentBracketCON, postTournamentMatchResultCON } from '../controllers/tournament_bracket.controller.js';
import { asyncHandler } from '../middleware/async_handler.js';
import { optionalAuth, requireAuth } from '../middleware/auth.middleware.js';

export const TOURNAMENTS_ROUTER = Router();

TOURNAMENTS_ROUTER.get('/tournaments', asyncHandler(getListTournamentsCON));
TOURNAMENTS_ROUTER.get('/tournaments/venue/:venueId', requireAuth, asyncHandler(getTournamentsByVenueCON));
//? Sin sesión obligatoria: un torneo PUBLIC sigue siendo visible para
//? cualquiera, pero `optionalAuth` resuelve `_req.authUser` cuando hay un
//? Bearer token válido, para que el use case pueda evaluar organizador/staff/
//? participante en un torneo PRIVATE.
TOURNAMENTS_ROUTER.get('/tournaments/:tournamentId', optionalAuth, asyncHandler(getTournamentByIdCON));
TOURNAMENTS_ROUTER.get('/tournaments/:tournamentId/bracket', requireAuth, asyncHandler(getTournamentBracketCON));
TOURNAMENTS_ROUTER.patch('/tournaments/:tournamentId/status', requireAuth, asyncHandler(patchTournamentStatusCON));
TOURNAMENTS_ROUTER.patch('/tournaments/:tournamentId/visibility', requireAuth, asyncHandler(patchTournamentVisibilityCON));
TOURNAMENTS_ROUTER.patch('/tournaments/:tournamentId/settings', requireAuth, asyncHandler(patchTournamentSettingsCON));
TOURNAMENTS_ROUTER.post('/tournaments/:tournamentId/matches/:matchId/results', requireAuth, asyncHandler(postTournamentMatchResultCON));

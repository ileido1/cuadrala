import { Router } from 'express';

import {
  getTournamentRegistrationsCON,
  postRegisterTournamentParticipantCON,
  withdrawTournamentRegistrationCON,
} from '../controllers/tournament_registration.controller.js';
import { asyncHandler } from '../middleware/async_handler.js';
import { requireAuth } from '../middleware/auth.middleware.js';

export const TOURNAMENT_REGISTRATION_ROUTER = Router();

TOURNAMENT_REGISTRATION_ROUTER.post(
  '/tournaments/:tournamentId/registrations',
  requireAuth,
  asyncHandler(postRegisterTournamentParticipantCON),
);

TOURNAMENT_REGISTRATION_ROUTER.get(
  '/tournaments/:tournamentId/registrations',
  requireAuth,
  asyncHandler(getTournamentRegistrationsCON),
);

TOURNAMENT_REGISTRATION_ROUTER.post(
  '/tournaments/:tournamentId/registrations/:userId/withdraw',
  requireAuth,
  asyncHandler(withdrawTournamentRegistrationCON),
);

import { Router } from 'express';

import {
  deleteTournamentRegistrationCON,
  getTournamentRegistrationsCON,
  patchTournamentRegistrationStatusCON,
  postInviteGuestTournamentParticipantCON,
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

//? Slice 1 (tournament-guest-registration): alta, confirmación y baja de invitados sin cuenta.
TOURNAMENT_REGISTRATION_ROUTER.post(
  '/tournaments/:tournamentId/invite-guest',
  requireAuth,
  asyncHandler(postInviteGuestTournamentParticipantCON),
);

TOURNAMENT_REGISTRATION_ROUTER.patch(
  '/tournaments/:tournamentId/registrations/:registrationId',
  requireAuth,
  asyncHandler(patchTournamentRegistrationStatusCON),
);

TOURNAMENT_REGISTRATION_ROUTER.delete(
  '/tournaments/:tournamentId/registrations/:registrationId',
  requireAuth,
  asyncHandler(deleteTournamentRegistrationCON),
);

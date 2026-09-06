import { Router } from 'express';

import {
  postConfirmPendingTournamentRegistrationsCON,
  postPairTournamentRegistrationsCON,
  deleteTournamentRegistrationPairCON,
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

//? Duplas fijas: en el MVP las arma el organizador. El jugador se inscribe
//? solo, como en cualquier torneo, y el emparejamiento es trabajo de quien
//? lleva el torneo. El guard de organizador vive en el caso de uso porque
//? necesita el torneo para saber quien lo organiza.
TOURNAMENT_REGISTRATION_ROUTER.post(
  '/tournaments/:tournamentId/registrations/pairs',
  requireAuth,
  asyncHandler(postPairTournamentRegistrationsCON),
);

TOURNAMENT_REGISTRATION_ROUTER.delete(
  '/tournaments/:tournamentId/registrations/:registrationId/pair',
  requireAuth,
  asyncHandler(deleteTournamentRegistrationPairCON),
);

//? Confirmar de a uno con dieciseis inscriptos son dieciseis toques, y
//? saltearse uno deja a ese jugador fuera del cuadro sin que nadie se entere.
TOURNAMENT_REGISTRATION_ROUTER.post(
  '/tournaments/:tournamentId/registrations/confirm-pending',
  requireAuth,
  asyncHandler(postConfirmPendingTournamentRegistrationsCON),
);

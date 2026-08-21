import { Router } from 'express';

import {
  deleteTournamentInvitationCON,
  getTournamentInvitationsCON,
  postInviteTournamentParticipantCON,
  postRespondTournamentInvitationCON,
} from '../controllers/tournament_invitation.controller.js';
import { asyncHandler } from '../middleware/async_handler.js';
import { requireAuth } from '../middleware/auth.middleware.js';

export const TOURNAMENT_INVITATION_ROUTER = Router();

TOURNAMENT_INVITATION_ROUTER.post(
  '/tournaments/:tournamentId/invitations',
  requireAuth,
  asyncHandler(postInviteTournamentParticipantCON),
);

TOURNAMENT_INVITATION_ROUTER.get(
  '/tournaments/:tournamentId/invitations',
  requireAuth,
  asyncHandler(getTournamentInvitationsCON),
);

TOURNAMENT_INVITATION_ROUTER.post(
  '/tournaments/:tournamentId/invitations/:invitationId/respond',
  requireAuth,
  asyncHandler(postRespondTournamentInvitationCON),
);

TOURNAMENT_INVITATION_ROUTER.delete(
  '/tournaments/:tournamentId/invitations/:invitationId',
  requireAuth,
  asyncHandler(deleteTournamentInvitationCON),
);

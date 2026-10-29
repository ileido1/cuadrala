import { Router } from 'express';

import {
  postCreateTournamentInviteLinkCON,
  getTournamentInviteLinksCON,
  deleteTournamentInviteLinkCON,
  getTournamentInviteLinkPreviewCON,
  postRegisterViaTournamentInviteLinkCON,
} from '../controllers/tournament_invite_link.controller.js';
import { asyncHandler } from '../middleware/async_handler.js';
import { optionalAuth, requireAuth } from '../middleware/auth.middleware.js';

//? Mismo patrón que tournament_schedule.router.ts: un único Router mezcla
//? rutas autenticadas y públicas (no hay "router público" separado en el proyecto).
export const TOURNAMENT_INVITE_LINK_ROUTER = Router();

TOURNAMENT_INVITE_LINK_ROUTER.post(
  '/tournaments/:tournamentId/invite-links',
  requireAuth,
  asyncHandler(postCreateTournamentInviteLinkCON),
);

TOURNAMENT_INVITE_LINK_ROUTER.get(
  '/tournaments/:tournamentId/invite-links',
  requireAuth,
  asyncHandler(getTournamentInviteLinksCON),
);

TOURNAMENT_INVITE_LINK_ROUTER.delete(
  '/tournaments/:tournamentId/invite-links/:linkId',
  requireAuth,
  asyncHandler(deleteTournamentInviteLinkCON),
);

//? optionalAuth: sin sesión responde preview igual; con sesión no cambia la
//? respuesta hoy, pero deja `_req.authUser` disponible si en el futuro hiciera falta.
TOURNAMENT_INVITE_LINK_ROUTER.get(
  '/public/tournament-invite-links/:token',
  optionalAuth,
  asyncHandler(getTournamentInviteLinkPreviewCON),
);

//? optionalAuth: si hay sesión, el controller la usa (REQ-TIL-007); si no,
//? exige y valida el body de invitado (REQ-TIL-008).
TOURNAMENT_INVITE_LINK_ROUTER.post(
  '/public/tournament-invite-links/:token/register',
  optionalAuth,
  asyncHandler(postRegisterViaTournamentInviteLinkCON),
);

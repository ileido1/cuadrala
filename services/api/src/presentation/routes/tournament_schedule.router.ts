import { Router } from 'express';

import {
  getTournamentScheduleCON,
  postGenerateTournamentScheduleCON,
  postRespondTournamentSlotCON,
  getMyTournamentMatchesCON,
  postRescheduleTournamentMatchCON,
  postSettleTournamentSlotCON,
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

//? Solo el organizador (o staff de la sede); el guard vive en el caso de uso
//? porque necesita el torneo para saber quien lo organiza.
TOURNAMENT_SCHEDULE_ROUTER.post(
  '/tournaments/:tournamentId/schedule/rounds/:roundNumber/matches/:matchNumber/settle',
  requireAuth,
  asyncHandler(postSettleTournamentSlotCON),
);

//? Mover un partido es la salida que hace viable pedirle el OK a los jugadores:
//? cuando alguien rechaza, o el turno vence, el partido vuelve al organizador.
TOURNAMENT_SCHEDULE_ROUTER.post(
  '/tournaments/:tournamentId/schedule/rounds/:roundNumber/matches/:matchNumber/reschedule',
  requireAuth,
  asyncHandler(postRescheduleTournamentMatchCON),
);

//? Responde la pregunta concreta del jugador —"cuando y donde juego"— en vez de
//? devolver el cuadro entero para que el cliente se busque adentro.
TOURNAMENT_SCHEDULE_ROUTER.get(
  '/tournaments/:tournamentId/schedule/my-matches',
  requireAuth,
  asyncHandler(getMyTournamentMatchesCON),
);

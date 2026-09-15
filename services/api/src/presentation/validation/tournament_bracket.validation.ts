import { z } from 'zod';

// Reutiliza el schema de ID de torneo ya definido en tournaments.validation.ts
export { TOURNAMENT_ID_PARAM_SCHEMA } from './tournaments.validation.js';

export const MATCH_ID_PARAM_SCHEMA = z
  .object({
    matchId: z.string().uuid('matchId debe ser un UUID valido.'),
  })
  .strict();

/**
 * Params de `POST /tournaments/:tournamentId/matches/:matchId/results`: Express fusiona
 * ambos segmentos en un solo `_req.params`, así que validarlo con dos schemas `.strict()`
 * separados (uno por cada id) siempre falla — cada uno ve la clave del otro como
 * "no reconocida". Un solo schema combinado valida ambos ids sin ese conflicto.
 */
export const TOURNAMENT_MATCH_RESULT_PARAMS_SCHEMA = z
  .object({
    tournamentId: z.string().uuid('tournamentId debe ser un UUID valido.'),
    matchId: z.string().uuid('matchId debe ser un UUID valido.'),
  })
  .strict();

export const SCORE_ENTRY_SCHEMA = z
  .object({
    scores: z
      .array(
        z.object({
          userId: z.string().uuid('userId debe ser un UUID valido.'),
          points: z.number().int().min(0, 'points debe ser un número no negativo.'),
        }),
      )
      .min(1, 'Debe proporcionar al menos un score.'),
  })
  .strict();

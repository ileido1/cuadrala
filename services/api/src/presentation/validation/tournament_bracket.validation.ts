import { z } from 'zod';

// Reutiliza el schema de ID de torneo ya definido en tournaments.validation.ts
export { TOURNAMENT_ID_PARAM_SCHEMA } from './tournaments.validation.js';

export const MATCH_ID_PARAM_SCHEMA = z
  .object({
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

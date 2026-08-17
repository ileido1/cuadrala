import { z } from 'zod';

export const TOURNAMENT_ID_PARAM_SCHEMA = z
  .object({
    tournamentId: z.string().uuid('tournamentId debe ser un UUID valido.'),
  })
  .strict();

export const GENERATE_TOURNAMENT_SCHEDULE_BODY_SCHEMA = z
  .object({
    doubleRound: z.boolean().optional(),
    thirdPlaceMatch: z.boolean().optional(),
  })
  .strict();


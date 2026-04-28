import { z } from 'zod';

export const TOURNAMENT_SCOREBOARD_TOURNAMENT_ID_PARAM_SCHEMA = z
  .object({
    tournamentId: z.string().uuid('tournamentId debe ser un UUID valido.'),
  })
  .strict();


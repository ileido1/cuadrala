import { z } from 'zod';

export const MATCHMAKING_PARAMS_SCHEMA = z.object({
  matchId: z.string().uuid('matchId debe ser un UUID valido.'),
});

export const MATCHMAKING_QUERY_SCHEMA = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
});

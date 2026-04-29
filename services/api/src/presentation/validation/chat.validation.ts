import { z } from 'zod';

export const MATCH_ID_PARAM_SCHEMA = z
  .object({
    matchId: z.string().uuid('matchId debe ser un UUID valido.'),
  })
  .strict();

export const TOURNAMENT_ID_PARAM_SCHEMA = z
  .object({
    tournamentId: z.string().uuid('tournamentId debe ser un UUID valido.'),
  })
  .strict();

export const LIST_CHAT_MESSAGES_QUERY_SCHEMA = z
  .object({
    limit: z.coerce.number().int().positive().max(200).default(50).optional(),
    cursorCreatedAt: z.string().datetime().optional(),
  })
  .strict();

export const POST_CHAT_MESSAGE_BODY_SCHEMA = z
  .object({
    text: z.string().min(1, 'El mensaje no puede estar vacío.').max(2000, 'El mensaje es demasiado largo.'),
  })
  .strict();


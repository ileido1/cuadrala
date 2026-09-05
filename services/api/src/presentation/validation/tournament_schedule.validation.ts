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


/** Respuesta de un jugador al horario de su partido. */
export const RESPOND_TOURNAMENT_SLOT_PARAM_SCHEMA = z.object({
  tournamentId: z.string().uuid(),
  roundNumber: z.coerce.number().int().positive(),
  matchNumber: z.coerce.number().int().positive(),
});

export const RESPOND_TOURNAMENT_SLOT_BODY_SCHEMA = z.object({
  response: z.enum(['ACCEPTED', 'REJECTED']),
});

/** Decisión del organizador sobre el turno de un partido. */
export const SETTLE_TOURNAMENT_SLOT_BODY_SCHEMA = z.object({
  decision: z.enum(['CONFIRM', 'RELEASE']),
});

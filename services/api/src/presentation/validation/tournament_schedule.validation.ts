import { z } from 'zod';

export const TOURNAMENT_ID_PARAM_SCHEMA = z
  .object({
    tournamentId: z.string().uuid('tournamentId debe ser un UUID valido.'),
  })
  .strict();

export const GENERATE_TOURNAMENT_SCHEDULE_BODY_SCHEMA = z
  .object({
    participantUserIds: z
      .array(z.string().uuid('Cada participante debe ser un UUID valido.'))
      .min(2, 'Se requieren al menos 2 participantes.'),
    doubleRound: z.boolean().optional(),
    thirdPlaceMatch: z.boolean().optional(),
  })
  .strict()
  .refine((_data) => new Set(_data.participantUserIds).size === _data.participantUserIds.length, {
    message: 'No se permiten participantes duplicados.',
    path: ['participantUserIds'],
  });


import { z } from 'zod';

export const TOURNAMENT_ID_PARAM_SCHEMA = z
  .object({
    tournamentId: z.string().uuid('tournamentId debe ser un UUID valido.'),
  })
  .strict();

export const GENERATE_TOURNAMENT_AMERICANO_SCHEDULE_BODY_SCHEMA = z
  .object({
    participantUserIds: z
      .array(z.string().uuid('Cada participante debe ser un UUID valido.'))
      .min(4, 'Se requieren al menos 4 participantes.'),
  })
  .strict()
  .refine((_data) => new Set(_data.participantUserIds).size === _data.participantUserIds.length, {
    message: 'No se permiten participantes duplicados.',
    path: ['participantUserIds'],
  })
  .refine((_data) => _data.participantUserIds.length % 4 === 0, {
    message: 'El número de participantes debe ser múltiplo de 4.',
    path: ['participantUserIds'],
  });

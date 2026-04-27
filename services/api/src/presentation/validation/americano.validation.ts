import { z } from 'zod';

export const CREATE_AMERICANO_BODY_SCHEMA = z
  .object({
    categoryId: z.string().uuid('categoryId debe ser un UUID valido.'),
    sportId: z.string().uuid('sportId debe ser un UUID valido.').optional(),
    courtId: z.string().uuid('courtId debe ser un UUID valido.').optional(),
    tournamentId: z.string().uuid('tournamentId debe ser un UUID valido.').optional(),
    scheduledAt: z.string().datetime({ offset: true }).optional(),
    participantUserIds: z
      .array(z.string().uuid('Cada participante debe ser un UUID valido.'))
      .min(2, 'Se requieren al menos dos participantes.'),
  })
  .strict()
  .refine((_data) => new Set(_data.participantUserIds).size === _data.participantUserIds.length, {
    message: 'No se permiten participantes duplicados.',
    path: ['participantUserIds'],
  });

export type CreateAmericanoBody = z.infer<typeof CREATE_AMERICANO_BODY_SCHEMA>;

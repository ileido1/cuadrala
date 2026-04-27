import { z } from 'zod';

export const CREATE_PARAMETRIZED_TOURNAMENT_BODY_SCHEMA = z
  .object({
    name: z.string().min(1, 'name es obligatorio.').max(200),
    categoryId: z.string().uuid('categoryId debe ser un UUID valido.'),
    sportId: z.string().uuid('sportId debe ser un UUID valido.'),
    formatPresetId: z.string().uuid('formatPresetId debe ser un UUID valido.'),
    formatParameters: z.record(z.string(), z.unknown()).optional(),
    startsAt: z.string().datetime({ offset: true }).optional(),
  })
  .strict();

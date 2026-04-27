import { z } from 'zod';

export const RECALCULATE_RANKING_PARAMS_SCHEMA = z.object({
  categoryId: z.string().uuid('categoryId debe ser un UUID valido.'),
});

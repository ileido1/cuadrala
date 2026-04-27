import { z } from 'zod';

export const SPORT_ID_PARAM_SCHEMA = z.object({
  sportId: z.string().uuid('sportId debe ser un UUID valido.'),
});

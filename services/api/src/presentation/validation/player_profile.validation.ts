import { z } from 'zod';

export const UPDATE_PLAYER_PROFILE_BODY_SCHEMA = z
  .object({
    dominantHand: z.enum(['RIGHT', 'LEFT', 'AMBIDEXTROUS']).optional(),
    sidePreference: z.enum(['RIGHT', 'LEFT', 'ANY']).optional(),
    birthYear: z.coerce.number().int().min(1900).optional().nullable(),
  })
  .strict();

export const USER_ID_PARAM_SCHEMA = z
  .object({
    userId: z.string().uuid('userId debe ser un UUID valido.'),
  })
  .strict();


import { z } from 'zod';

/// E.164 laxo: + opcional, 8 a 15 dígitos.
const PHONE_REGEX = /^\+?\d{8,15}$/;

export const UPDATE_PLAYER_PROFILE_BODY_SCHEMA = z
  .object({
    dominantHand: z.enum(['RIGHT', 'LEFT', 'AMBIDEXTROUS']).optional(),
    sidePreference: z.enum(['RIGHT', 'LEFT', 'ANY']).optional(),
    birthYear: z.coerce.number().int().min(1900).optional().nullable(),
    // YYYY-MM-DD
    birthDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'birthDate debe ser YYYY-MM-DD.')
      .optional()
      .nullable(),
    phone: z.string().regex(PHONE_REGEX, 'phone debe tener formato E.164 (8 a 15 dígitos).').optional().nullable(),
    avatarUrl: z.string().url('avatarUrl debe ser una URL válida.').optional().nullable(),
    city: z.string().min(1).max(120).optional().nullable(),
  })
  .strict();

export const USER_ID_PARAM_SCHEMA = z
  .object({
    userId: z.string().uuid('userId debe ser un UUID valido.'),
  })
  .strict();


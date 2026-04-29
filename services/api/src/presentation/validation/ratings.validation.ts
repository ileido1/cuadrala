import { z } from 'zod';

import { USER_ID_PARAM_SCHEMA } from './player_profile.validation.js';

export const GET_USER_RATINGS_PARAMS_SCHEMA = USER_ID_PARAM_SCHEMA;

export const GET_USER_RATINGS_QUERY_SCHEMA = z
  .object({
    categoryId: z.string().uuid('categoryId debe ser un UUID valido.').optional(),
  })
  .strict();

export const GET_USER_RATING_HISTORY_PARAMS_SCHEMA = USER_ID_PARAM_SCHEMA;

export const GET_USER_RATING_HISTORY_QUERY_SCHEMA = z
  .object({
    categoryId: z.string().uuid('categoryId debe ser un UUID valido.').optional(),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  })
  .strict();


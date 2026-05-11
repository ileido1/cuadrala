import { z } from 'zod';

export const LIST_TOURNAMENTS_QUERY_SCHEMA = z
  .object({
    status: z
      .enum(['DRAFT', 'OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'])
      .optional(),
    sportId: z.string().uuid('sportId debe ser un UUID valido.').optional(),
    categoryId: z.string().uuid('categoryId debe ser un UUID valido.').optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export const TOURNAMENT_ID_PARAM_SCHEMA = z
  .object({
    tournamentId: z.string().uuid('tournamentId debe ser un UUID valido.'),
  })
  .strict();

export const VENUE_ID_PARAM_SCHEMA = z
  .object({
    venueId: z.string().uuid('venueId debe ser un UUID valido.'),
  })
  .strict();

export const LIST_TOURNAMENTS_BY_VENUE_QUERY_SCHEMA = z
  .object({
    status: z
      .enum(['DRAFT', 'OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'])
      .optional(),
    sportId: z.string().uuid('sportId debe ser un UUID valido.').optional(),
    categoryId: z.string().uuid('categoryId debe ser un UUID valido.').optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export const UPDATE_TOURNAMENT_STATUS_BODY_SCHEMA = z
  .object({
    status: z.enum(['DRAFT', 'OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
  })
  .strict();
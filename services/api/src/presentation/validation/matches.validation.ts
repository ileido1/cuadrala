import { z } from 'zod';

export const LIST_OPEN_MATCHES_QUERY_SCHEMA = z
  .object({
    sportId: z.string().uuid('sportId debe ser un UUID valido.'),
    categoryId: z.string().uuid('categoryId debe ser un UUID valido.').optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    scheduledFrom: z.string().datetime({ offset: true }).optional(),
    scheduledTo: z.string().datetime({ offset: true }).optional(),
  })
  .strict();

export const MATCH_ID_PARAM_SCHEMA = z
  .object({
    matchId: z.string().uuid('matchId debe ser un UUID valido.'),
  })
  .strict();

export const LIST_MATCHES_QUERY_SCHEMA = z
  .object({
    sportId: z.string().uuid('sportId debe ser un UUID valido.').optional(),
    categoryId: z.string().uuid('categoryId debe ser un UUID valido.').optional(),
    status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'FINISHED', 'CANCELLED']).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    scheduledFrom: z.string().datetime({ offset: true }).optional(),
    scheduledTo: z.string().datetime({ offset: true }).optional(),
  })
  .strict();

export const CREATE_MATCH_BODY_SCHEMA = z
  .object({
    sportId: z.string().uuid('sportId debe ser un UUID valido.'),
    categoryId: z.string().uuid('categoryId debe ser un UUID valido.'),
    type: z.enum(['AMERICANO', 'REGULAR']).optional(),
    scheduledAt: z.string().datetime({ offset: true }).optional(),
    courtId: z.string().uuid('courtId debe ser un UUID valido.').optional(),
    tournamentId: z.string().uuid('tournamentId debe ser un UUID valido.').optional(),
    maxParticipants: z.coerce.number().int().min(2).max(100).optional(),
  })
  .strict();

export const UPDATE_MATCH_BODY_SCHEMA = z
  .object({
    scheduledAt: z.string().datetime({ offset: true }).nullable().optional(),
    courtId: z.string().uuid('courtId debe ser un UUID valido.').nullable().optional(),
    maxParticipants: z.coerce.number().int().min(2).max(100).optional(),
  })
  .strict();



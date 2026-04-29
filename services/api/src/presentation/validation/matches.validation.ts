import { z } from 'zod';

export const LIST_OPEN_MATCHES_QUERY_SCHEMA = z
  .object({
    sportId: z.string().uuid('sportId debe ser un UUID valido.'),
    categoryId: z.string().uuid('categoryId debe ser un UUID valido.').optional(),
    near: z.string().regex(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/, 'near debe ser "lat,lng".').optional(),
    radiusKm: z.coerce.number().positive().max(200).optional(),
    minPricePerPlayerCents: z.coerce.number().int().min(0).optional(),
    maxPricePerPlayerCents: z.coerce.number().int().min(0).optional(),
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
    pricePerPlayerCents: z.coerce.number().int().min(0).max(100_000_000).optional(),
    maxParticipants: z.coerce.number().int().min(2).max(100).optional(),
  })
  .strict();

export const UPDATE_MATCH_BODY_SCHEMA = z
  .object({
    scheduledAt: z.string().datetime({ offset: true }).nullable().optional(),
    courtId: z.string().uuid('courtId debe ser un UUID valido.').nullable().optional(),
    pricePerPlayerCents: z.coerce.number().int().min(0).max(100_000_000).optional(),
    maxParticipants: z.coerce.number().int().min(2).max(100).optional(),
  })
  .strict();

export const UPSERT_MATCH_RESULT_DRAFT_BODY_SCHEMA = z
  .object({
    scores: z
      .array(
        z.object({
          userId: z.string().uuid('userId debe ser un UUID valido.'),
          points: z.coerce.number().int().min(0).max(10_000),
        }),
      )
      .min(1, 'scores debe tener al menos 1 item.'),
  })
  .strict();

export const CONFIRM_MATCH_RESULT_DRAFT_BODY_SCHEMA = z
  .object({
    status: z.enum(['CONFIRMED', 'REJECTED']),
  })
  .strict();



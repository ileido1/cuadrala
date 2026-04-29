import { z } from 'zod';

export const PUBLISH_VACANT_HOUR_BODY_SCHEMA = z
  .object({
    venueId: z.string().uuid('venueId debe ser un UUID valido.'),
    courtId: z.string().uuid('courtId debe ser un UUID valido.'),
    sportId: z.string().uuid('sportId debe ser un UUID valido.'),
    categoryId: z.string().uuid('categoryId debe ser un UUID valido.'),
    scheduledAt: z.string().datetime({ offset: true }),
    durationMinutes: z.coerce.number().int().positive().optional(),
    pricePerPlayerCents: z.coerce.number().int().min(0).max(100_000_000).optional(),
    maxParticipants: z.coerce.number().int().min(2).max(100).optional(),
  })
  .strict();

export const LIST_VACANT_HOURS_QUERY_SCHEMA = z
  .object({
    venueId: z.string().uuid('venueId debe ser un UUID valido.').optional(),
    courtId: z.string().uuid('courtId debe ser un UUID valido.').optional(),
    status: z.enum(['PUBLISHED', 'CANCELLED']).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export const VACANT_HOUR_ID_PARAM_SCHEMA = z
  .object({
    id: z.string().uuid('id debe ser un UUID valido.'),
  })
  .strict();


import { z } from 'zod';

export const VENUE_ID_PARAMS_SCHEMA = z
  .object({
    venueId: z.string().uuid('venueId debe ser un UUID valido.'),
  })
  .strict();

export const UPSERT_VENUE_STAFF_BODY_SCHEMA = z
  .object({
    userId: z.string().uuid('userId debe ser un UUID valido.'),
    role: z.enum(['OWNER', 'STAFF']).optional(),
  })
  .strict();

export const LIST_VENUE_TRANSACTIONS_PARAMS_SCHEMA = z
  .object({
    venueId: z.string().uuid('venueId debe ser un UUID valido.'),
  })
  .strict();

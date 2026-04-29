import { z } from 'zod';

export const LIST_VENUES_QUERY_SCHEMA = z
  .object({
    near: z
      .string()
      .regex(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/, 'near debe ser "lat,lng".')
      .optional(),
    radiusKm: z.coerce.number().positive().max(200).default(10),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    page: z.coerce.number().int().min(1).default(1),
  })
  .strict();

export const CREATE_VENUE_BODY_SCHEMA = z
  .object({
    name: z.string().min(1).max(120),
    address: z.string().min(1).max(200).optional(),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
  })
  .strict();

export const VENUE_ID_PARAM_SCHEMA = z
  .object({
    venueId: z.string().uuid('venueId debe ser un UUID valido.'),
  })
  .strict();

export const CREATE_COURT_BODY_SCHEMA = z
  .object({
    name: z.string().min(1).max(120),
  })
  .strict();


import { z } from 'zod';

export const GEO_SEARCH_QUERY_SCHEMA = z
  .object({
    q: z.string().min(2, 'q debe tener al menos 2 caracteres.').max(200),
    near: z
      .string()
      .regex(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/, 'near debe ser "lat,lng".')
      .optional(),
    limit: z.coerce.number().int().min(1).max(10).default(5),
  })
  .strict();

export const GEO_PLACE_ID_PARAM_SCHEMA = z
  .object({
    placeId: z.string().min(1, 'placeId es obligatorio.').max(300),
  })
  .strict();

export const VENUE_ID_PARAM_SCHEMA = z
  .object({
    venueId: z.string().uuid('venueId debe ser un UUID valido.'),
  })
  .strict();

export const VENUE_GEOCODE_BODY_SCHEMA = z
  .object({
    placeId: z.string().min(1, 'placeId es obligatorio.').max(300),
  })
  .strict();


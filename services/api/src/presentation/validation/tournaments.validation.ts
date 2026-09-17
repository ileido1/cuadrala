import { z } from 'zod';

export const LIST_TOURNAMENTS_QUERY_SCHEMA = z
  .object({
    status: z.enum(['DRAFT', 'OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
    sportId: z.string().uuid('sportId debe ser un UUID valido.').optional(),
    categoryId: z.string().uuid('categoryId debe ser un UUID valido.').optional(),
    venueId: z.string().uuid('venueId debe ser un UUID valido.').optional(),
    startsAtFrom: z.string().datetime({ message: 'startsAtFrom debe ser ISO 8601.' }).optional(),
    startsAtTo: z.string().datetime({ message: 'startsAtTo debe ser ISO 8601.' }).optional(),
    near: z
      .string()
      .regex(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/, 'near debe ser "lat,lng".')
      .optional(),
    radiusKm: z.coerce
      .number()
      .positive('radiusKm debe ser mayor a 0.')
      .max(200, 'radiusKm no puede superar 200.')
      .optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict()
  .refine(
    (_d) =>
      _d.startsAtFrom === undefined ||
      _d.startsAtTo === undefined ||
      new Date(_d.startsAtFrom).getTime() <= new Date(_d.startsAtTo).getTime(),
    { message: 'startsAtFrom debe ser menor o igual a startsAtTo.' },
  );

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
    status: z.enum(['DRAFT', 'OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
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

export const UPDATE_TOURNAMENT_VISIBILITY_BODY_SCHEMA = z
  .object({
    visibility: z.enum(['PUBLIC', 'PRIVATE']),
  })
  .strict();

export const UPDATE_TOURNAMENT_SETTINGS_BODY_SCHEMA = z
  .object({
    name: z.string().trim().min(1).max(160).optional(),
    sportId: z.string().uuid().optional(),
    categoryId: z.string().uuid().optional(),
    formatPresetId: z.string().uuid().optional(),
    formatParameters: z.record(z.string(), z.unknown()).nullable().optional(),
    startsAt: z.string().datetime().nullable().optional(),
    endsAt: z.string().datetime().nullable().optional(),
    venueId: z.string().uuid().nullable().optional(),
    gender: z.enum(['MALE', 'FEMALE', 'MIXED']).nullable().optional(),
    pairedRegistration: z.boolean().optional(),
    inscriptionPrice: z.number().finite().min(0).nullable().optional(),
    maxSlots: z.number().int().positive().nullable().optional(),
    registrationClosesAt: z.string().datetime().nullable().optional(),
  })
  .strict();

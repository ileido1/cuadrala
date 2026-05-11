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
    paymentHolder: z.string().min(1).max(200).optional(),
    paymentBank: z.string().min(1).max(200).optional(),
    paymentCvu: z.string().min(1).max(200).optional(),
    paymentAlias: z.string().min(1).max(200).optional(),
    paymentNotes: z.string().min(1).max(500).optional(),
    ownerUserId: z.string().uuid('ownerUserId debe ser un UUID valido.').optional(),
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
    sportType: z.enum(['PADEL', 'TENNIS']).optional(),
    indoor: z.boolean().optional(),
    lighting: z.boolean().optional(),
    surfaceType: z.string().max(60).nullable().optional(),
    pricePerHourCents: z.number().int().nonnegative().nullable().optional(),
    capacity: z.string().max(20).nullable().optional(),
    durationMinutes: z.number().int().positive().optional(),
  })
  .strict();

export const UPDATE_COURT_BODY_SCHEMA = z
  .object({
    name: z.string().min(1).max(120).optional(),
    sportType: z.enum(['PADEL', 'TENNIS']).optional(),
    indoor: z.boolean().optional(),
    lighting: z.boolean().optional(),
    surfaceType: z.string().max(60).nullable().optional(),
    pricePerHourCents: z.number().int().nonnegative().nullable().optional(),
    capacity: z.string().max(20).nullable().optional(),
    durationMinutes: z.number().int().positive().optional(),
  })
  .strict();

export const COURT_ID_PARAM_SCHEMA = z
  .object({
    courtId: z.string().uuid('courtId debe ser un UUID válido.'),
  })
  .strict();

export const LIST_COURTS_QUERY_SCHEMA = z
  .object({
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  })
  .strict();

export const LIST_VENUE_MATCHES_QUERY_SCHEMA = z
  .object({
    courtId: z.string().uuid('courtId debe ser un UUID válido.').optional(),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'date debe estar en formato YYYY-MM-DD.')
      .optional(),
    status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'FINISHED', 'CANCELLED']).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

// Schema para GET /venues/:venueId/dashboard-stats
export const DASHBOARD_STATS_QUERY_SCHEMA = z
  .object({
    // Sin filtros por ahora, preparado para futuras métricas (ej. período)
  })
  .strict();

// Schema para GET /venues/:venueId/transactions/stats
export const TRANSACTIONS_STATS_QUERY_SCHEMA = z
  .object({
    // Sin filtros por ahora, preparado para rango de fechas
  })
  .strict();

// Schema para GET /venues/:venueId/transactions/history
export const TRANSACTIONS_HISTORY_QUERY_SCHEMA = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

// Schema para PATCH /venues/:venueId
export const UPDATE_VENUE_BODY_SCHEMA = z
  .object({
    phone: z.string().max(30).nullable().optional(),
    email: z.string().email('Email inválido.').max(120).nullable().optional(),
    description: z.string().max(500).nullable().optional(),
    openingHours: z
      .object({
        monday: z.object({ open: z.string(), close: z.string() }).optional(),
        tuesday: z.object({ open: z.string(), close: z.string() }).optional(),
        wednesday: z.object({ open: z.string(), close: z.string() }).optional(),
        thursday: z.object({ open: z.string(), close: z.string() }).optional(),
        friday: z.object({ open: z.string(), close: z.string() }).optional(),
        saturday: z.object({ open: z.string(), close: z.string() }).optional(),
        sunday: z.object({ open: z.string(), close: z.string() }).optional(),
      })
      .nullable()
      .optional(),
  })
  .strict();

// Schema para GET /venues/:venueId/matches (con from/to para calendario)
export const VENUE_MATCHES_QUERY_SCHEMA = z
  .object({
    from: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'from debe estar en formato YYYY-MM-DD.')
      .optional(),
    to: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'to debe estar en formato YYYY-MM-DD.')
      .optional(),
    courtId: z.string().uuid('courtId debe ser un UUID válido.').optional(),
    status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'FINISHED', 'CANCELLED']).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();


/**
 * Validadores Zod para la API de Backoffice Reservations.
 * Endpoints: POST/GET/DELETE /venues/:venueId/reservations
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Parámetros
// ---------------------------------------------------------------------------

export const RESERVATION_ID_PARAM_SCHEMA = z
  .object({
    reservationId: z.string().uuid('reservationId debe ser un UUID valido.'),
  })
  .passthrough();

export const VENUE_ID_PARAM_SCHEMA = z
  .object({
    venueId: z.string().uuid('venueId debe ser un UUID valido.'),
  })
  .strict();

// ---------------------------------------------------------------------------
// Body: Crear reserva
// ---------------------------------------------------------------------------

const RESPONSIBLE_SCHEMA = z.discriminatedUnion('type', [
  z.object({ type: z.literal('PLAYER'), playerId: z.string().uuid('playerId debe ser un UUID.') }),
  z.object({ type: z.literal('GUEST'), name: z.string().min(1, 'Nombre requerido'), phone: z.string().optional() }),
]);

export const CREATE_RESERVATION_BODY_SCHEMA = z
  .object({
    courtId: z.string().uuid('courtId debe ser un UUID valido.'),
    sportId: z.string().uuid('sportId debe ser un UUID valido.').optional(),
    categoryId: z.string().uuid('categoryId debe ser un UUID valido.').optional(),
    type: z.enum(['DIRECT', 'BLOCKED']).optional().default('DIRECT'),
    scheduledAt: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/, 'scheduledAt debe ser ISO datetime')),
    durationMinutes: z.coerce.number().int().positive().optional(),
    notes: z.string().max(500).nullable().optional(),
    responsible: RESPONSIBLE_SCHEMA.optional(),
  })
  .strict();

// ---------------------------------------------------------------------------
// Query: Listar reservas
// ---------------------------------------------------------------------------

export const LIST_RESERVATIONS_QUERY_SCHEMA = z
  .object({
    courtId: z.string().uuid('courtId debe ser un UUID valido.').optional(),
    from: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'from debe estar en formato YYYY-MM-DD.')
      .optional(),
    to: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'to debe estar en formato YYYY-MM-DD.')
      .optional(),
    status: z.enum(['CONFIRMED', 'CANCELLED']).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export const COURT_ID_PARAM_SCHEMA = z
  .object({
    courtId: z.string().uuid('courtId debe ser un UUID valido.'),
  })
  .strict();

export const BLOCK_SLOT_BODY_SCHEMA = z
  .object({
    scheduledAt: z.string().datetime({ offset: true }),
    durationMinutes: z.coerce.number().int().positive().default(60),
    notes: z.string().max(500).nullable().optional(),
  })
  .strict();
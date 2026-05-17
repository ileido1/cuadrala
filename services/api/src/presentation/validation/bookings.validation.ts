/**
 * Validadores Zod para la API de Bookings unificada.
 * Endpoints: GET/POST/PATCH/DELETE /venues/:venueId/bookings
 */

import { z } from 'zod';

export const VENUE_ID_PARAM_SCHEMA = z
  .object({
    venueId: z.string().uuid('venueId debe ser un UUID válido.'),
  })
  .strict();

export const BOOKING_ID_PARAM_SCHEMA = VENUE_ID_PARAM_SCHEMA.extend({
  bookingId: z.string().uuid('bookingId debe ser un UUID válido.'),
});

export const LIST_BOOKINGS_QUERY_SCHEMA = z
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
    status: z.enum(['CONFIRMED', 'CANCELLED']).optional(),
    type: z.enum(['DIRECT', 'BLOCKED', 'MATCH']).optional(),
    visibility: z.enum(['PUBLISHED', 'DRAFT', 'PRIVATE']).optional(),
    page: z.coerce.number().int().min(1).default(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
  })
  .strict();

export const CREATE_BOOKING_BODY_SCHEMA = z
  .object({
    type: z.enum(['DIRECT', 'BLOCKED', 'MATCH']),
    courtId: z.string().uuid('courtId debe ser un UUID válido.'),
    sportId: z.string().uuid('sportId debe ser un UUID válido.').optional(),
    categoryId: z.string().uuid('categoryId debe ser un UUID válido.').optional(),
    scheduledAt: z.string().datetime({ offset: true }).or(
      z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/, 'scheduledAt debe ser ISO datetime'),
    ),
    durationMinutes: z.coerce.number().int().positive().max(240).default(60).optional(),
    visibility: z.enum(['PUBLISHED', 'DRAFT', 'PRIVATE']).default('DRAFT').optional(),
    organizerUserId: z.string().uuid().optional(),
    formatPresetId: z.string().uuid().optional(),
    formatParameters: z.record(z.unknown()).optional(),
    maxParticipants: z.coerce.number().int().min(2).max(20).default(4).optional(),
    pricePerPlayerCents: z.coerce.number().int().min(0).default(0).optional(),
    notes: z.string().max(500).nullable().optional(),
    responsibleName: z.string().max(100).optional(),
    responsiblePhone: z.string().max(20).optional(),
  })
  .strict()
  .superRefine((_data, _ctx) => {
    if (_data.type === 'MATCH' && _data.organizerUserId === undefined) {
      _ctx.addIssue({
        code: 'custom',
        message: 'organizerUserId es requerido para type=MATCH.',
        path: ['organizerUserId'],
      });
    }
  });

export const UPDATE_BOOKING_BODY_SCHEMA = z
  .object({
    visibility: z.enum(['PUBLISHED', 'DRAFT', 'PRIVATE']).optional(),
    matchStatus: z.enum(['SCHEDULED', 'IN_PROGRESS', 'FINISHED', 'CANCELLED']).optional(),
    notes: z.string().max(500).nullable().optional(),
    maxParticipants: z.coerce.number().int().min(2).max(20).optional(),
    pricePerPlayerCents: z.coerce.number().int().min(0).optional(),
    formatPresetId: z.string().uuid().optional(),
    formatParameters: z.record(z.unknown()).nullable().optional(),
  })
  .strict();

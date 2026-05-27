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
    gender: z.enum(['MALE', 'FEMALE', 'MIXED']).optional(),
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
    venueId: z.string().uuid('venueId debe ser un UUID valido.').optional(),
    durationMinutes: z.coerce.number().int().min(1).max(24 * 60).optional(),
    tournamentId: z.string().uuid('tournamentId debe ser un UUID valido.').optional(),
    pricePerPlayerCents: z.coerce.number().int().min(0).max(100_000_000).optional(),
    maxParticipants: z.coerce.number().int().min(2).max(100).optional(),
    notes: z.string().trim().min(1).max(500).optional(),
    affectsElo: z.boolean().optional(),
    gender: z.enum(['MALE', 'FEMALE', 'MIXED']).optional(),
  })
  .strict()
  .superRefine((_data, _ctx) => {
    const HAS_COURT = _data.courtId !== undefined;
    const HAS_SCHED = _data.scheduledAt !== undefined;
    if (HAS_COURT !== HAS_SCHED) {
      _ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'courtId y scheduledAt deben enviarse juntos.',
      });
      return;
    }
    if (HAS_COURT && _data.venueId === undefined) {
      _ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'venueId es obligatorio al reservar una cancha.',
      });
    }
  });

export const UPDATE_MATCH_BODY_SCHEMA = z
  .object({
    scheduledAt: z.string().datetime({ offset: true }).nullable().optional(),
    courtId: z.string().uuid('courtId debe ser un UUID valido.').nullable().optional(),
    venueId: z.string().uuid('venueId debe ser un UUID valido.').optional(),
    durationMinutes: z.coerce.number().int().min(1).max(24 * 60).optional(),
    pricePerPlayerCents: z.coerce.number().int().min(0).max(100_000_000).optional(),
    maxParticipants: z.coerce.number().int().min(2).max(100).optional(),
  })
  .strict();

const _TEAM_ENTRY_SCHEMA = z.object({
  label: z.enum(['A', 'B']),
  userIds: z.array(z.string().uuid()).min(1).max(2),
});

const _SET_SCORE_SCHEMA = z.object({
  teamA: z.coerce.number().int().min(0).max(10),
  teamB: z.coerce.number().int().min(0).max(10),
});

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
    teams: z.array(_TEAM_ENTRY_SCHEMA).min(2).max(2).optional(),
    sets: z.array(_SET_SCORE_SCHEMA).optional(),
    // Note: z.record does not validate key format at runtime — string keys only
    sideByUserId: z.record(z.string(), z.enum(['DRIVE', 'REVES'])).optional(),
  })
  .strict();

export const CONFIRM_MATCH_RESULT_DRAFT_BODY_SCHEMA = z
  .object({
    status: z.enum(['CONFIRMED', 'REJECTED']),
  })
  .strict();

export const LIST_MY_MATCHES_QUERY_SCHEMA = z
  .object({
    status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'FINISHED', 'CANCELLED']).optional(),
    role: z.enum(['CREATOR', 'PARTICIPANT', 'ANY']).optional(),
    scheduledFrom: z.string().datetime({ offset: true }).optional(),
    scheduledTo: z.string().datetime({ offset: true }).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();


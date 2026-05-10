import { z } from 'zod';

// ---------------------------------------------------------------------------
// Params: /venues/:venueId/courts/:courtId/slots
// ---------------------------------------------------------------------------
export const COURT_SLOTS_PARAMS_SCHEMA = z
  .object({
    venueId: z.string().uuid('venueId debe ser un UUID valido.'),
    courtId: z.string().uuid('courtId debe ser un UUID valido.'),
  })
  .strict();

// ---------------------------------------------------------------------------
// Query: ?date=YYYY-MM-DD&durationMinutes=60&stepMinutes=30&sportId=...&categoryId=...
// ---------------------------------------------------------------------------
export const COURT_SLOTS_QUERY_SCHEMA = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD'),
    durationMinutes: z.coerce.number().int().min(1).max(1440).optional().default(60),
    stepMinutes: z.coerce.number().int().min(1).max(1440).optional().default(30),
    sportId: z.string().uuid('sportId debe ser un UUID valido.').optional(),
    categoryId: z.string().uuid('categoryId debe ser un UUID valido.').optional(),
  })
  .strict()
  .superRefine(({ sportId, categoryId }, _ctx) => {
    const HAS_SPORT = sportId !== undefined;
    const HAS_CATEGORY = categoryId !== undefined;
    if (HAS_SPORT !== HAS_CATEGORY) {
      _ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'sportId y categoryId deben enviarse juntos.',
      });
    }
  });

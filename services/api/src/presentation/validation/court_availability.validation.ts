import { z } from 'zod';

export const VENUE_AVAILABILITY_PARAMS_SCHEMA = z
  .object({
    venueId: z.string().uuid('venueId debe ser un UUID valido.'),
  })
  .strict();

export const VENUE_AVAILABILITY_QUERY_SCHEMA = z
  .object({
    courtId: z.string().uuid('courtId debe ser un UUID valido.').optional(),
    from: z.string().datetime({ offset: true }),
    to: z.string().datetime({ offset: true }),
    durationMinutes: z.coerce.number().int().min(1).max(24 * 60).optional(),
    stepMinutes: z.coerce.number().int().min(1).max(24 * 60).optional(),
    sportId: z.string().uuid('sportId debe ser un UUID valido.').optional(),
    categoryId: z.string().uuid('categoryId debe ser un UUID valido.').optional(),
  })
  .strict()
  .superRefine((_data, _ctx) => {
    if (new Date(_data.from).getTime() >= new Date(_data.to).getTime()) {
      _ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'from debe ser menor que to.',
      });
    }
    const HAS_SPORT = _data.sportId !== undefined;
    const HAS_CATEGORY = _data.categoryId !== undefined;
    if (HAS_SPORT !== HAS_CATEGORY) {
      _ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'sportId y categoryId deben enviarse juntos.',
      });
    }
  });


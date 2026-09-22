import { z } from 'zod';

const SLOT_SCHEMA = z.enum(['MORNING', 'AFTERNOON', 'EVENING']);

export const START_QUICK_MATCH_BODY_SCHEMA = z
  .object({
    sportId: z.string().uuid('sportId debe ser un UUID valido.'),
    day: z.enum(['TODAY', 'TOMORROW', 'CUSTOM']),
    date: z.string().date('date debe tener formato YYYY-MM-DD.').optional(),
    slots: z.array(SLOT_SCHEMA).min(1).max(3),
    widenLevel: z.boolean().default(false),
    zoneKm: z.coerce.number().int().min(1).max(100).default(10),
    includeOpenMatches: z.boolean().default(true),
  })
  .strict()
  .superRefine((_data, _ctx) => {
    if (_data.day === 'CUSTOM' && _data.date === undefined) {
      _ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'date es obligatorio cuando day es CUSTOM.',
        path: ['date'],
      });
    }
    if (_data.day !== 'CUSTOM' && _data.date !== undefined) {
      _ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'date solo se permite cuando day es CUSTOM.',
        path: ['date'],
      });
    }
  });

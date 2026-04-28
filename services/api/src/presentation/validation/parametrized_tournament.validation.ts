import { z } from 'zod';

export const CREATE_PARAMETRIZED_TOURNAMENT_BODY_SCHEMA = z
  .object({
    name: z.string().min(1, 'name es obligatorio.').max(200),
    categoryId: z.string().uuid('categoryId debe ser un UUID valido.'),
    sportId: z.string().uuid('sportId debe ser un UUID valido.'),
    formatPresetId: z.string().uuid('formatPresetId debe ser un UUID valido.').optional(),
    formatPresetCode: z
      .string()
      .min(1, 'formatPresetCode es obligatorio.')
      .max(50)
      .regex(/^[A-Z0-9_]+$/, 'formatPresetCode debe ser un código válido (A-Z, 0-9, _).')
      .optional(),
    formatParameters: z.record(z.string(), z.unknown()).optional(),
    startsAt: z.string().datetime({ offset: true }).optional(),
  })
  .strict()
  .superRefine((_value, _ctx) => {
    if (_value.formatPresetId === undefined && _value.formatPresetCode === undefined) {
      _ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Debe enviar formatPresetId o formatPresetCode.',
        path: ['formatPresetId'],
      });
    }
  });

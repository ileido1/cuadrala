import { z } from 'zod';

export const SPORT_ID_PARAM_SCHEMA = z.object({
  sportId: z.string().uuid('sportId debe ser un UUID valido.'),
});

export const FORMAT_PRESET_CODE_PARAM_SCHEMA = z
  .object({
    code: z
      .string()
      .min(1)
      .max(50)
      .regex(/^[A-Z0-9_]+$/, 'code debe ser un código válido (A-Z, 0-9, _).'),
  })
  .strict();

export const PUBLISH_FORMAT_PRESET_VERSION_BODY_SCHEMA = z
  .object({
    name: z.string().min(1).max(120),
    schemaVersion: z.coerce.number().int().min(1),
    defaultParameters: z.unknown(),
    effectiveFrom: z.string().datetime({ offset: true }).optional(),
  })
  .strict();

import { z } from 'zod';

export const NOTIFICATION_SUBSCRIPTION_ID_PARAM_SCHEMA = z
  .object({
    id: z.string().uuid('id debe ser un UUID valido.'),
  })
  .strict();

export const UPSERT_NOTIFICATION_SUBSCRIPTION_BODY_SCHEMA = z
  .object({
    id: z.string().uuid('id debe ser un UUID valido.').optional(),
    categoryId: z.string().uuid('categoryId debe ser un UUID valido.').nullable().optional(),
    nearLat: z.number().min(-90, 'nearLat fuera de rango.').max(90, 'nearLat fuera de rango.').nullable().optional(),
    nearLng: z
      .number()
      .min(-180, 'nearLng fuera de rango.')
      .max(180, 'nearLng fuera de rango.')
      .nullable()
      .optional(),
    radiusKm: z.number().positive('radiusKm debe ser mayor a 0.').max(200, 'radiusKm fuera de rango.').nullable().optional(),
    enabled: z.boolean(),
    enabledTypes: z
      .object({
        MATCH_SLOT_OPENED: z.boolean().optional(),
        MATCH_CANCELLED: z.boolean().optional(),
        CHAT_MESSAGE: z.boolean().optional(),
        PAYMENT_PENDING: z.boolean().optional(),
      })
      .strict()
      .optional(),
  })
  .strict()
  .superRefine((_val, _ctx) => {
    const HAS_NEAR_LAT = _val.nearLat !== undefined && _val.nearLat !== null;
    const HAS_NEAR_LNG = _val.nearLng !== undefined && _val.nearLng !== null;
    const HAS_RADIUS = _val.radiusKm !== undefined && _val.radiusKm !== null;

    const ANY_GEO = HAS_NEAR_LAT || HAS_NEAR_LNG || HAS_RADIUS;
    const ALL_GEO = HAS_NEAR_LAT && HAS_NEAR_LNG && HAS_RADIUS;

    if (ANY_GEO && !ALL_GEO) {
      _ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'nearLat, nearLng y radiusKm deben venir juntos.',
      });
    }
  });


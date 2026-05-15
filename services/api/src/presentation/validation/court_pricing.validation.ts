import { z } from 'zod';

// Schema para GET /venues/:venueId/courts/:courtId/pricing-tiers
export const LIST_PRICING_TIERS_QUERY_SCHEMA = z
  .object({})
  .strict();

// Schema para POST /venues/:venueId/courts/:courtId/pricing-tiers
export const CREATE_PRICING_TIER_BODY_SCHEMA = z
  .object({
    label: z.string().min(1).max(60),
    startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Formato HH:MM'),
    endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Formato HH:MM'),
    pricePerHourCents: z.number().int().nonnegative(),
  })
  .strict();

// Schema para PUT /venues/:venueId/courts/:courtId/pricing-tiers/:tierId
export const UPDATE_PRICING_TIER_BODY_SCHEMA = z
  .object({
    label: z.string().min(1).max(60).optional(),
    startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Formato HH:MM').optional(),
    endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Formato HH:MM').optional(),
    pricePerHourCents: z.number().int().nonnegative().optional(),
  })
  .strict();

// Schema para path params
export const PRICING_TIER_ID_PARAM_SCHEMA = z
  .object({
    tierId: z.string().uuid('tierId debe ser un UUID válido.'),
  });

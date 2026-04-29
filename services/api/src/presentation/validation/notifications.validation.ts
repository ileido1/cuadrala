import { z } from 'zod';

export const DISPATCH_NOTIFICATIONS_BODY_SCHEMA = z
  .object({
    limitEvents: z.coerce.number().int().positive().max(500).default(100).optional(),
    limitDeliveries: z.coerce.number().int().positive().max(10_000).default(1000).optional(),
    limitTokens: z.coerce.number().int().positive().max(100_000).optional(),
  })
  .strict();


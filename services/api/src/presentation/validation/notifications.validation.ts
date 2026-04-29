import { z } from 'zod';

export const DISPATCH_NOTIFICATIONS_BODY_SCHEMA = z
  .object({
    limitEvents: z.coerce.number().int().positive().max(500).default(100).optional(),
    limitDeliveries: z.coerce.number().int().positive().max(10_000).default(1000).optional(),
    limitTokens: z.coerce.number().int().positive().max(100_000).optional(),
  })
  .strict();

export const CREATE_MATCH_CANCELLED_NOTIFICATION_EVENT_BODY_SCHEMA = z
  .object({
    matchId: z.string().uuid(),
    categoryId: z.string().uuid(),
    userIds: z.array(z.string().uuid()).min(1),
    payload: z.unknown().optional(),
  })
  .strict();


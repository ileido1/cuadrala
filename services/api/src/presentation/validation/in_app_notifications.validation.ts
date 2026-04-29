import { z } from 'zod';

export const LIST_MY_IN_APP_NOTIFICATIONS_QUERY_SCHEMA = z
  .object({
    status: z.enum(['unread', 'all']).default('unread').optional(),
    page: z.coerce.number().int().min(1).default(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
  })
  .strict();

export const IN_APP_NOTIFICATION_DELIVERY_ID_PARAM_SCHEMA = z
  .object({
    deliveryId: z.string().uuid(),
  })
  .strict();


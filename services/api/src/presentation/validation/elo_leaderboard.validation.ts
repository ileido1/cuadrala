import { z } from 'zod';

export const GET_ELO_LEADERBOARD_QUERY_SCHEMA = z.object({
  categoryId: z.string().uuid(),
  limit: z.coerce.number().int().positive().max(200).default(50),
});


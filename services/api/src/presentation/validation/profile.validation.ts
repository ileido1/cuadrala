import { z } from 'zod';

export const PATCH_PROFILE_BODY_SCHEMA = z
  .object({
    name: z.string().min(1).max(200).optional(),
  })
  .strict();

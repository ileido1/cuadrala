import { z } from 'zod';

export const DEVICE_PUSH_TOKEN_ID_PARAMS_SCHEMA = z.object({
  id: z.string().uuid(),
});

export const UPSERT_MY_DEVICE_PUSH_TOKEN_BODY_SCHEMA = z.object({
  token: z.string().min(16, 'token inválido.'),
  enabled: z.boolean().default(true),
});


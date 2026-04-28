import { z } from 'zod';

const ENV_SCHEMA = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatoria para la API.'),
  PG_POOL_MAX: z.coerce.number().int().positive().default(10),
  PG_POOL_IDLE_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
  PG_POOL_CONNECTION_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
  JWT_ACCESS_SECRET: z
    .string()
    .min(32, 'JWT_ACCESS_SECRET debe tener al menos 32 caracteres.')
    .default('dev-only-access-secret-min-32-chars-long!!'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, 'JWT_REFRESH_SECRET debe tener al menos 32 caracteres.')
    .default('dev-only-refresh-secret-min-32-chars-long!!'),
});

const PARSED_ENV = ENV_SCHEMA.safeParse(process.env);

if (!PARSED_ENV.success) {
  throw new Error('Configuracion de entorno invalida para API.');
}

export const ENV_CONST = PARSED_ENV.data;

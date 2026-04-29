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
  NOTIFICATIONS_DISPATCH_SECRET: z
    .string()
    .min(32, 'NOTIFICATIONS_DISPATCH_SECRET debe tener al menos 32 caracteres.')
    .default('dev-only-notifications-dispatch-secret-min-32!!'),
  GEO_DISPATCH_SECRET: z
    .string()
    .min(32, 'GEO_DISPATCH_SECRET debe tener al menos 32 caracteres.')
    .default('dev-only-geo-dispatch-secret-min-32-chars!!!!'),
  ADMIN_DISPATCH_SECRET: z
    .string()
    .min(32, 'ADMIN_DISPATCH_SECRET debe tener al menos 32 caracteres.')
    .default('dev-only-admin-dispatch-secret-min-32-chars!!!!!!'),
  MAPS_PROVIDER: z.enum(['noop', 'stub', 'mapbox', 'google']).default('noop'),
  MAPBOX_ACCESS_TOKEN: z.string().optional(),
  GOOGLE_MAPS_API_KEY: z.string().optional(),
  NOTIFICATIONS_WORKER_ENABLED: z
    .enum(['true', 'false'])
    .optional()
    .transform((_v) => _v === 'true')
    .default(false),
  NOTIFICATIONS_WORKER_INTERVAL_MS: z.coerce.number().int().positive().default(60_000),
  NOTIFICATIONS_WORKER_LIMIT_EVENTS: z.coerce.number().int().positive().default(100),
  NOTIFICATIONS_WORKER_LIMIT_DELIVERIES: z.coerce.number().int().positive().default(1000),
  NOTIFICATIONS_WORKER_LIMIT_TOKENS: z.coerce.number().int().positive().default(5000),
  NOTIFICATIONS_WORKER_TICK_TIMEOUT_MS: z.coerce.number().int().positive().default(55_000),
  NOTIFICATIONS_WORKER_ALERT_BACKLOG_EVENTS: z.coerce.number().int().nonnegative().default(500),
  NOTIFICATIONS_WORKER_ALERT_BACKLOG_DELIVERIES: z.coerce.number().int().nonnegative().default(5000),
  NOTIFICATIONS_WORKER_ALERT_FAILURE_RATE_PCT: z.coerce.number().int().min(0).max(100).default(50),
  NOTIFICATIONS_WORKER_ALERT_FAILURE_RATE_MIN_ATTEMPTS: z.coerce.number().int().nonnegative().default(20),
  FCM_SERVICE_ACCOUNT_JSON_BASE64: z.string().optional(),
  FCM_DRY_RUN: z
    .enum(['true', 'false'])
    .optional()
    .transform((_v) => _v === 'true'),
  ELO_K_FACTOR: z.coerce.number().positive().max(512).default(32),
  ELO_INITIAL_RATING: z.coerce.number().positive().max(10_000).default(1500),
  ELO_MIN_RATING: z.coerce.number().positive().max(10_000).default(100),
  ELO_MAX_RATING: z.coerce.number().positive().max(10_000).default(3000),
  ELO_PROVISIONAL_GAMES: z.coerce.number().int().nonnegative().max(10_000).default(10),
  ELO_PROVISIONAL_K_MULTIPLIER: z.coerce.number().positive().max(10).default(2),
  MATCHMAKING_DEFAULT_RADIUS_KM: z.coerce.number().positive().max(200).default(10),
});

const PARSED_ENV = ENV_SCHEMA.safeParse(process.env);

if (!PARSED_ENV.success) {
  throw new Error('Configuracion de entorno invalida para API.');
}

export const ENV_CONST = PARSED_ENV.data;

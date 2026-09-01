import { z } from 'zod';

/**
 * Valores de desarrollo para los secretos. Están en el repo a propósito: hacen
 * que `npm run dev` y los tests arranquen sin configuración. Por lo mismo son
 * públicos, así que `assertProductionSecretsSV` los prohíbe en producción.
 */
const DEV_SECRETS = {
  JWT_ACCESS_SECRET: 'dev-only-access-secret-min-32-chars-long!!',
  JWT_REFRESH_SECRET: 'dev-only-refresh-secret-min-32-chars-long!!',
  NOTIFICATIONS_DISPATCH_SECRET: 'dev-only-notifications-dispatch-secret-min-32!!',
  GEO_DISPATCH_SECRET: 'dev-only-geo-dispatch-secret-min-32-chars!!!!',
  ADMIN_DISPATCH_SECRET: 'dev-only-admin-dispatch-secret-min-32-chars!!!!!!',
} as const;

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
    .default(DEV_SECRETS.JWT_ACCESS_SECRET),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, 'JWT_REFRESH_SECRET debe tener al menos 32 caracteres.')
    .default(DEV_SECRETS.JWT_REFRESH_SECRET),
  NOTIFICATIONS_DISPATCH_SECRET: z
    .string()
    .min(32, 'NOTIFICATIONS_DISPATCH_SECRET debe tener al menos 32 caracteres.')
    .default(DEV_SECRETS.NOTIFICATIONS_DISPATCH_SECRET),
  GEO_DISPATCH_SECRET: z
    .string()
    .min(32, 'GEO_DISPATCH_SECRET debe tener al menos 32 caracteres.')
    .default(DEV_SECRETS.GEO_DISPATCH_SECRET),
  ADMIN_DISPATCH_SECRET: z
    .string()
    .min(32, 'ADMIN_DISPATCH_SECRET debe tener al menos 32 caracteres.')
    .default(DEV_SECRETS.ADMIN_DISPATCH_SECRET),
  MAPS_PROVIDER: z.enum(['noop', 'stub', 'mapbox', 'google']).default('noop'),
  MAPBOX_ACCESS_TOKEN: z.string().optional(),
  GOOGLE_MAPS_API_KEY: z.string().optional(),
  GOOGLE_OAUTH_CLIENT_ID: z.string().optional(),
  /** Bundle ID (iOS) o Service ID (web) según tu configuración de Apple Sign In. */
  APPLE_SIGNIN_AUDIENCE: z.string().optional(),
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
  NOTIFICATIONS_WORKER_ALERT_BACKLOG_DELIVERIES: z.coerce
    .number()
    .int()
    .nonnegative()
    .default(5000),
  NOTIFICATIONS_WORKER_ALERT_FAILURE_RATE_PCT: z.coerce.number().int().min(0).max(100).default(50),
  NOTIFICATIONS_WORKER_ALERT_FAILURE_RATE_MIN_ATTEMPTS: z.coerce
    .number()
    .int()
    .nonnegative()
    .default(20),
  MATCH_STATUS_WORKER_ENABLED: z
    .enum(['true', 'false'])
    .optional()
    .transform((_v) => _v === 'true')
    .default(true),
  MATCH_STATUS_WORKER_INTERVAL_MS: z.coerce.number().int().positive().default(60_000),
  MATCH_STATUS_WORKER_TICK_TIMEOUT_MS: z.coerce.number().int().positive().default(55_000),
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
  MULTI_CURRENCY_PAYMENTS: z
    .enum(['true', 'false'])
    .optional()
    .transform((_v) => _v === 'true')
    .default(false),
  RESERVATION_PAYMENT_LEDGER: z
    .enum(['true', 'false'])
    .optional()
    .transform((_v) => _v === 'true')
    .default(false),
});

const PARSED_ENV = ENV_SCHEMA.safeParse(process.env);

if (!PARSED_ENV.success) {
  //? El detalle de Zod nombra la variable que falta: sin él, un deploy roto
  //? avisa que la configuración está mal pero no qué parte.
  const DETAIL = PARSED_ENV.error.issues
    .map((_issue) => `${_issue.path.join('.')}: ${_issue.message}`)
    .join('; ');
  throw new Error(`Configuracion de entorno invalida para API. ${DETAIL}`);
}

export const ENV_CONST = PARSED_ENV.data;

/**
 * @name    :assertProductionSecretsSV
 * @version :1.0.0
 * @description :Falla el arranque en producción si algún secreto quedó con su
 * valor de desarrollo. Sin esto, desplegar sin configurar `ADMIN_DISPATCH_SECRET`
 * deja `PATCH /admin/matches/:id/cancel` y `POST /ranking/recalculate/:id`
 * protegidos por una cadena que está publicada en el repositorio.
 * @param {typeof ENV_CONST} _env - Entorno ya parseado
 * @return {void}
 * @throws {Error} Si el entorno es `production` y hay secretos sin configurar
 */
function assertProductionSecretsSV(_env: typeof ENV_CONST): void {
  if (_env.NODE_ENV !== 'production') return;

  const USING_DEV_DEFAULT = Object.entries(DEV_SECRETS)
    .filter(([_name, _devValue]) => _env[_name as keyof typeof DEV_SECRETS] === _devValue)
    .map(([_name]) => _name);

  if (USING_DEV_DEFAULT.length > 0) {
    throw new Error(
      `Configuracion de entorno invalida para API: en produccion hay que definir ${USING_DEV_DEFAULT.join(', ')}.`,
    );
  }
}

assertProductionSecretsSV(ENV_CONST);

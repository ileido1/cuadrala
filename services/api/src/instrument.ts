// Debe ser el PRIMER import de main.ts: Sentry necesita inicializarse antes
// de que se cargue cualquier otro módulo (Express, Prisma, etc.) para poder
// instrumentarlos correctamente.
import 'dotenv/config';

import * as Sentry from '@sentry/node';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV ?? 'development',
  // 100% en dev, 20% en producción para controlar volumen de eventos.
  tracesSampleRate: IS_PRODUCTION ? 0.2 : 1.0,
});

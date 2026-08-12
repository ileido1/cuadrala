/**
 * Vitest: ajusta DATABASE_URL antes de que se carguen módulos que dependen de Prisma.
 * - Con TEST_DATABASE_URL: las pruebas de integración usan esa base.
 * - Sin DB local: placeholder para que el módulo de entorno valide; las integraciones se omiten.
 *
 * Se elimina explícitamente la configuración de FCM para que los tests usen siempre
 * el NoopPushNotificationProvider y sean deterministas sin depender de credenciales
 * externas ni de la red.
 */
process.env.NODE_ENV = 'test';
delete process.env.FCM_SERVICE_ACCOUNT_JSON_BASE64;

if (process.env.TEST_DATABASE_URL !== undefined && process.env.TEST_DATABASE_URL !== '') {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
} else if (process.env.DATABASE_URL === undefined || process.env.DATABASE_URL === '') {
  process.env.DATABASE_URL = 'postgresql://127.0.0.1:5432/cuadrala_test_placeholder';
}

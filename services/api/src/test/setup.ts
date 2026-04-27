/**
 * Vitest: ajusta DATABASE_URL antes de que se carguen módulos que dependen de Prisma.
 * - Con TEST_DATABASE_URL: las pruebas de integración usan esa base.
 * - Sin DB local: placeholder para que el módulo de entorno valide; las integraciones se omiten.
 */
process.env.NODE_ENV = 'test';

if (process.env.TEST_DATABASE_URL !== undefined && process.env.TEST_DATABASE_URL !== '') {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
} else if (process.env.DATABASE_URL === undefined || process.env.DATABASE_URL === '') {
  process.env.DATABASE_URL = 'postgresql://127.0.0.1:5432/cuadrala_test_placeholder';
}

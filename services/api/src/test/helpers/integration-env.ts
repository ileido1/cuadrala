/** Pruebas de integración HTTP + DB solo si hay URL de test explícita. */
export const HAS_INTEGRATION_DATABASE =
  typeof process.env.TEST_DATABASE_URL === 'string' && process.env.TEST_DATABASE_URL.length > 0;

import { describe, expect, it } from 'vitest';

import { buildPgPoolConfigSV } from '../../infrastructure/prisma_pg_adapter.js';

describe('buildPgPoolConfigSV', () => {
  it('should trust the Supabase CA without letting URL SSL parameters override TLS verification', () => {
    const CA = '-----BEGIN CERTIFICATE-----\npublic-ca\n-----END CERTIFICATE-----';
    const CONFIG = buildPgPoolConfigSV(
      'postgres://db-user:db-password@example.supabase.com:5432/postgres?sslmode=require&sslrootcert=%2Ftmp%2Fother.crt&sslcert=%2Ftmp%2Fclient.crt&sslkey=%2Ftmp%2Fclient.key&application_name=cuadrala',
      CA,
    );
    const CONNECTION_URL = new URL(CONFIG.connectionString!);

    expect(CONNECTION_URL.searchParams.get('application_name')).toBe('cuadrala');
    expect(CONNECTION_URL.searchParams.has('sslmode')).toBe(false);
    expect(CONNECTION_URL.searchParams.has('sslrootcert')).toBe(false);
    expect(CONNECTION_URL.searchParams.has('sslcert')).toBe(false);
    expect(CONNECTION_URL.searchParams.has('sslkey')).toBe(false);
    expect(CONFIG.ssl).toMatchObject({ ca: CA, rejectUnauthorized: true });
  });

  it('should preserve existing SSL configuration for non-Supabase databases', () => {
    const DATABASE_URL = 'postgresql://localhost:5432/cuadrala_test?sslmode=disable';

    const CONFIG = buildPgPoolConfigSV(DATABASE_URL, 'unused-ca');

    expect(CONFIG.connectionString).toBe(DATABASE_URL);
    expect(CONFIG.ssl).toBeUndefined();
  });
});

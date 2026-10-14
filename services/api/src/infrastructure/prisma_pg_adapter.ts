import { readFileSync } from 'node:fs';

import { PrismaPg } from '@prisma/adapter-pg';
import { Pool, type PoolConfig } from 'pg';

import { PrismaClient } from '../generated/prisma/client.js';

const SUPABASE_CA = readFileSync(new URL('../../prisma/prod-ca-2021.crt', import.meta.url), 'utf8');
const SSL_URL_PARAMETERS = ['sslmode', 'sslrootcert', 'sslcert', 'sslkey'];

export function buildPgPoolConfigSV(_databaseUrl: string, _ca = SUPABASE_CA): PoolConfig {
  const DATABASE_URL = new URL(_databaseUrl);
  if (
    !DATABASE_URL.hostname.endsWith('.supabase.com')
    && !DATABASE_URL.hostname.endsWith('.supabase.co')
  ) {
    return { connectionString: _databaseUrl };
  }

  for (const PARAMETER of SSL_URL_PARAMETERS) {
    DATABASE_URL.searchParams.delete(PARAMETER);
  }

  return {
    connectionString: DATABASE_URL.toString(),
    ssl: { ca: _ca, rejectUnauthorized: true },
  };
}

export function createPrismaPgAdapterSV(_databaseUrl: string): {
  prisma: PrismaClient;
  pool: Pool;
} {
  const POOL = new Pool(buildPgPoolConfigSV(_databaseUrl));
  const PRISMA = new PrismaClient({ adapter: new PrismaPg(POOL) });
  return { prisma: PRISMA, pool: POOL };
}

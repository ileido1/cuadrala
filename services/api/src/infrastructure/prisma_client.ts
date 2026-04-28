import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { Pool } from 'pg';

import { ENV_CONST } from '../config/env.js';

export const POOL = new Pool({
  connectionString: ENV_CONST.DATABASE_URL,
  max: ENV_CONST.PG_POOL_MAX,
  idleTimeoutMillis: ENV_CONST.PG_POOL_IDLE_TIMEOUT_MS,
  connectionTimeoutMillis: ENV_CONST.PG_POOL_CONNECTION_TIMEOUT_MS,
});
const ADAPTER = new PrismaPg(POOL);

/** Cliente Prisma singleton (Prisma 7 + adapter PostgreSQL). */
export const PRISMA = new PrismaClient({ adapter: ADAPTER });

export async function disconnectDatabaseSV(): Promise<void> {
  await PRISMA.$disconnect();
  await POOL.end();
}

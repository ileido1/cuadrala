import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { Pool } from 'pg';

import { ENV_CONST } from '../config/env.js';

const POOL = new Pool({ connectionString: ENV_CONST.DATABASE_URL });
const ADAPTER = new PrismaPg(POOL);

/** Cliente Prisma singleton (Prisma 7 + adapter PostgreSQL). */
export const PRISMA = new PrismaClient({ adapter: ADAPTER });

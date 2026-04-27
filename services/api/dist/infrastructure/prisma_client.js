"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PRISMA = void 0;
const adapter_pg_1 = require("@prisma/adapter-pg");
const client_js_1 = require("../generated/prisma/client.js");
const pg_1 = require("pg");
const env_js_1 = require("../config/env.js");
const POOL = new pg_1.Pool({ connectionString: env_js_1.ENV_CONST.DATABASE_URL });
const ADAPTER = new adapter_pg_1.PrismaPg(POOL);
/** Cliente Prisma singleton (Prisma 7 + adapter PostgreSQL). */
exports.PRISMA = new client_js_1.PrismaClient({ adapter: ADAPTER });

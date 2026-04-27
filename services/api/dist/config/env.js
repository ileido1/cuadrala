"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENV_CONST = void 0;
const zod_1 = require("zod");
const ENV_SCHEMA = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'test', 'production']).default('development'),
    PORT: zod_1.z.coerce.number().int().positive().default(4000),
    DATABASE_URL: zod_1.z.string().min(1, 'DATABASE_URL es obligatoria para la API.'),
    JWT_ACCESS_SECRET: zod_1.z
        .string()
        .min(32, 'JWT_ACCESS_SECRET debe tener al menos 32 caracteres.')
        .default('dev-only-access-secret-min-32-chars-long!!'),
    JWT_REFRESH_SECRET: zod_1.z
        .string()
        .min(32, 'JWT_REFRESH_SECRET debe tener al menos 32 caracteres.')
        .default('dev-only-refresh-secret-min-32-chars-long!!'),
});
const PARSED_ENV = ENV_SCHEMA.safeParse(process.env);
if (!PARSED_ENV.success) {
    throw new Error('Configuracion de entorno invalida para API.');
}
exports.ENV_CONST = PARSED_ENV.data;

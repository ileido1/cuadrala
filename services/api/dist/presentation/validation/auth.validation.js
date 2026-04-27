"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REFRESH_BODY_SCHEMA = exports.LOGIN_BODY_SCHEMA = exports.REGISTER_BODY_SCHEMA = void 0;
const zod_1 = require("zod");
exports.REGISTER_BODY_SCHEMA = zod_1.z
    .object({
    email: zod_1.z.string().email('email debe ser un correo valido.'),
    password: zod_1.z.string().min(8, 'La contraseña debe tener al menos 8 caracteres.').max(128),
    name: zod_1.z.string().min(1, 'name es obligatorio.').max(200),
})
    .strict();
exports.LOGIN_BODY_SCHEMA = zod_1.z
    .object({
    email: zod_1.z.string().email('email debe ser un correo valido.'),
    password: zod_1.z.string().min(1, 'password es obligatorio.'),
})
    .strict();
exports.REFRESH_BODY_SCHEMA = zod_1.z
    .object({
    refreshToken: zod_1.z.string().min(1, 'refreshToken es obligatorio.'),
})
    .strict();

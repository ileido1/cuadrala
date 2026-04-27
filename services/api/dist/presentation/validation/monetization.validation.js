"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.USER_TRANSACTIONS_QUERY_SCHEMA = exports.UPDATE_SUBSCRIPTION_BODY_SCHEMA = exports.CREATE_OBLIGATIONS_BODY_SCHEMA = exports.USER_ID_PARAM_SCHEMA = exports.TRANSACTION_ID_PARAM_SCHEMA = exports.MATCH_ID_PARAM_SCHEMA = void 0;
const zod_1 = require("zod");
exports.MATCH_ID_PARAM_SCHEMA = zod_1.z.object({
    matchId: zod_1.z.string().uuid('matchId debe ser un UUID valido.'),
});
exports.TRANSACTION_ID_PARAM_SCHEMA = zod_1.z.object({
    transactionId: zod_1.z.string().uuid('transactionId debe ser un UUID valido.'),
});
exports.USER_ID_PARAM_SCHEMA = zod_1.z.object({
    userId: zod_1.z.string().uuid('userId debe ser un UUID valido.'),
});
exports.CREATE_OBLIGATIONS_BODY_SCHEMA = zod_1.z
    .object({
    amountBasePerPerson: zod_1.z.number().positive('amountBasePerPerson debe ser un numero positivo.'),
    participantUserIds: zod_1.z
        .array(zod_1.z.string().uuid('Cada participante debe ser un UUID valido.'))
        .optional(),
})
    .strict();
exports.UPDATE_SUBSCRIPTION_BODY_SCHEMA = zod_1.z
    .object({
    subscriptionType: zod_1.z.enum(['FREE', 'PRO'], {
        message: 'subscriptionType debe ser FREE o PRO.',
    }),
})
    .strict();
/** Query opcional para listar transacciones del usuario (paginación simple por límite). */
exports.USER_TRANSACTIONS_QUERY_SCHEMA = zod_1.z.object({
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(50),
});

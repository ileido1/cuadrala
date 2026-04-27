"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MATCHMAKING_QUERY_SCHEMA = exports.MATCHMAKING_PARAMS_SCHEMA = void 0;
const zod_1 = require("zod");
exports.MATCHMAKING_PARAMS_SCHEMA = zod_1.z.object({
    matchId: zod_1.z.string().uuid('matchId debe ser un UUID valido.'),
});
exports.MATCHMAKING_QUERY_SCHEMA = zod_1.z.object({
    limit: zod_1.z.coerce.number().int().min(1).max(50).optional().default(10),
});

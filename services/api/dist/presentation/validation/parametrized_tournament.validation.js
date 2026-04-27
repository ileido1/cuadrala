"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CREATE_PARAMETRIZED_TOURNAMENT_BODY_SCHEMA = void 0;
const zod_1 = require("zod");
exports.CREATE_PARAMETRIZED_TOURNAMENT_BODY_SCHEMA = zod_1.z
    .object({
    name: zod_1.z.string().min(1, 'name es obligatorio.').max(200),
    categoryId: zod_1.z.string().uuid('categoryId debe ser un UUID valido.'),
    sportId: zod_1.z.string().uuid('sportId debe ser un UUID valido.'),
    formatPresetId: zod_1.z.string().uuid('formatPresetId debe ser un UUID valido.'),
    formatParameters: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
    startsAt: zod_1.z.string().datetime({ offset: true }).optional(),
})
    .strict();

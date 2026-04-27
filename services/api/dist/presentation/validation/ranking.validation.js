"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RECALCULATE_RANKING_PARAMS_SCHEMA = void 0;
const zod_1 = require("zod");
exports.RECALCULATE_RANKING_PARAMS_SCHEMA = zod_1.z.object({
    categoryId: zod_1.z.string().uuid('categoryId debe ser un UUID valido.'),
});

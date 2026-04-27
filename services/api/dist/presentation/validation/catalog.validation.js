"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SPORT_ID_PARAM_SCHEMA = void 0;
const zod_1 = require("zod");
exports.SPORT_ID_PARAM_SCHEMA = zod_1.z.object({
    sportId: zod_1.z.string().uuid('sportId debe ser un UUID valido.'),
});

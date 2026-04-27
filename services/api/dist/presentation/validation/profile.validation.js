"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PATCH_PROFILE_BODY_SCHEMA = void 0;
const zod_1 = require("zod");
exports.PATCH_PROFILE_BODY_SCHEMA = zod_1.z
    .object({
    name: zod_1.z.string().min(1).max(200).optional(),
})
    .strict();

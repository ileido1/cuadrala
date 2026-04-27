"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CREATE_AMERICANO_BODY_SCHEMA = void 0;
const zod_1 = require("zod");
exports.CREATE_AMERICANO_BODY_SCHEMA = zod_1.z
    .object({
    categoryId: zod_1.z.string().uuid('categoryId debe ser un UUID valido.'),
    sportId: zod_1.z.string().uuid('sportId debe ser un UUID valido.').optional(),
    courtId: zod_1.z.string().uuid('courtId debe ser un UUID valido.').optional(),
    tournamentId: zod_1.z.string().uuid('tournamentId debe ser un UUID valido.').optional(),
    scheduledAt: zod_1.z.string().datetime({ offset: true }).optional(),
    participantUserIds: zod_1.z
        .array(zod_1.z.string().uuid('Cada participante debe ser un UUID valido.'))
        .min(2, 'Se requieren al menos dos participantes.'),
})
    .strict()
    .refine((_data) => new Set(_data.participantUserIds).size === _data.participantUserIds.length, {
    message: 'No se permiten participantes duplicados.',
    path: ['participantUserIds'],
});

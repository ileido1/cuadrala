"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findTournamentByIdRepo = findTournamentByIdRepo;
exports.createTournamentRepo = createTournamentRepo;
const prisma_client_js_1 = require("../prisma_client.js");
async function findTournamentByIdRepo(_id) {
    return prisma_client_js_1.PRISMA.tournament.findUnique({ where: { id: _id } });
}
async function createTournamentRepo(_data) {
    return prisma_client_js_1.PRISMA.tournament.create({
        data: {
            name: _data.name,
            categoryId: _data.categoryId,
            sportId: _data.sportId,
            formatPresetId: _data.formatPresetId,
            presetSchemaVersion: _data.presetSchemaVersion,
            ...(_data.formatParameters !== undefined
                ? { formatParameters: _data.formatParameters }
                : {}),
            ...(_data.startsAt !== undefined ? { startsAt: _data.startsAt } : {}),
        },
    });
}

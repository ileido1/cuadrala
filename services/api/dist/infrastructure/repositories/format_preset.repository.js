"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listFormatPresetsBySportRepo = listFormatPresetsBySportRepo;
exports.findFormatPresetByIdRepo = findFormatPresetByIdRepo;
exports.findFormatPresetBySportAndCodeRepo = findFormatPresetBySportAndCodeRepo;
const prisma_client_js_1 = require("../prisma_client.js");
async function listFormatPresetsBySportRepo(_sportId) {
    return prisma_client_js_1.PRISMA.tournamentFormatPreset.findMany({
        where: { sportId: _sportId, isActive: true },
        orderBy: { code: 'asc' },
    });
}
async function findFormatPresetByIdRepo(_id) {
    return prisma_client_js_1.PRISMA.tournamentFormatPreset.findUnique({ where: { id: _id } });
}
async function findFormatPresetBySportAndCodeRepo(_sportId, _code) {
    return prisma_client_js_1.PRISMA.tournamentFormatPreset.findUnique({
        where: {
            sportId_code: {
                sportId: _sportId,
                code: _code,
            },
        },
    });
}

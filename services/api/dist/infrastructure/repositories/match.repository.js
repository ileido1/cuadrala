"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findMatchByIdRepo = findMatchByIdRepo;
exports.findMatchWithParticipantsRepo = findMatchWithParticipantsRepo;
exports.createMatchWithParticipantsRepo = createMatchWithParticipantsRepo;
const prisma_client_js_1 = require("../prisma_client.js");
const MATCH_WITH_PARTICIPANTS = {
    participants: { include: { user: true } },
    category: true,
};
async function findMatchByIdRepo(_matchId) {
    return prisma_client_js_1.PRISMA.match.findUnique({ where: { id: _matchId } });
}
async function findMatchWithParticipantsRepo(_matchId) {
    return prisma_client_js_1.PRISMA.match.findUnique({
        where: { id: _matchId },
        include: MATCH_WITH_PARTICIPANTS,
    });
}
async function createMatchWithParticipantsRepo(_data) {
    return prisma_client_js_1.PRISMA.$transaction(async (_tx) => {
        const CREATED_MATCH = await _tx.match.create({
            data: {
                categoryId: _data.categoryId,
                sportId: _data.sportId,
                ...(_data.formatPresetId !== undefined ? { formatPresetId: _data.formatPresetId } : {}),
                ...(_data.formatParameters !== undefined
                    ? { formatParameters: _data.formatParameters }
                    : {}),
                ...(_data.courtId !== undefined ? { courtId: _data.courtId } : {}),
                ...(_data.tournamentId !== undefined ? { tournamentId: _data.tournamentId } : {}),
                ...(_data.scheduledAt !== undefined ? { scheduledAt: _data.scheduledAt } : {}),
                type: 'AMERICANO',
                status: 'SCHEDULED',
            },
        });
        await _tx.matchParticipant.createMany({
            data: _data.participantUserIds.map((_userId, _index) => ({
                matchId: CREATED_MATCH.id,
                userId: _userId,
                teamLabel: _index % 2 === 0 ? 'A' : 'B',
            })),
        });
        const PARTICIPANTS = await _tx.matchParticipant.findMany({
            where: { matchId: CREATED_MATCH.id },
        });
        return { ...CREATED_MATCH, participants: PARTICIPANTS };
    });
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aggregateScoresByCategoryRepo = aggregateScoresByCategoryRepo;
exports.replaceRankingForCategoryRepo = replaceRankingForCategoryRepo;
exports.listRankingSuggestionsRepo = listRankingSuggestionsRepo;
const prisma_client_js_1 = require("../prisma_client.js");
/** Agrega puntos y partidos jugados por usuario desde resultados de la categoría. */
async function aggregateScoresByCategoryRepo(_categoryId) {
    const RESULTS = await prisma_client_js_1.PRISMA.matchResult.findMany({
        where: { match: { categoryId: _categoryId } },
        include: { scores: true },
    });
    const BY_USER = new Map();
    for (const _r of RESULTS) {
        for (const _s of _r.scores) {
            const CUR = BY_USER.get(_s.userId) ?? { points: 0, matchIds: new Set() };
            CUR.points += _s.points;
            CUR.matchIds.add(_r.matchId);
            BY_USER.set(_s.userId, CUR);
        }
    }
    return [...BY_USER.entries()].map(([_userId, _v]) => ({
        userId: _userId,
        points: _v.points,
        gamesPlayed: _v.matchIds.size,
    }));
}
async function replaceRankingForCategoryRepo(_categoryId, _rows) {
    await prisma_client_js_1.PRISMA.$transaction(async (_tx) => {
        await _tx.rankingEntry.deleteMany({ where: { categoryId: _categoryId } });
        if (_rows.length > 0) {
            await _tx.rankingEntry.createMany({
                data: _rows.map((_r) => ({
                    categoryId: _categoryId,
                    userId: _r.userId,
                    points: _r.points,
                    gamesPlayed: _r.gamesPlayed,
                })),
            });
        }
    });
}
async function listRankingSuggestionsRepo(_categoryId, _excludeUserIds, _limit) {
    const ROWS = await prisma_client_js_1.PRISMA.rankingEntry.findMany({
        where: {
            categoryId: _categoryId,
            ...(_excludeUserIds.length > 0 ? { userId: { notIn: _excludeUserIds } } : {}),
        },
        orderBy: { points: 'desc' },
        take: _limit,
        include: { user: { select: { name: true } } },
    });
    return ROWS.map((_r) => ({
        userId: _r.userId,
        points: _r.points,
        name: _r.user.name,
    }));
}

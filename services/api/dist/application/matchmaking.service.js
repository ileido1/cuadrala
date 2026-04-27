"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMatchmakingSuggestionsSV = getMatchmakingSuggestionsSV;
const app_error_js_1 = require("../domain/errors/app_error.js");
const match_repository_js_1 = require("../infrastructure/repositories/match.repository.js");
const ranking_repository_js_1 = require("../infrastructure/repositories/ranking.repository.js");
const user_repository_js_1 = require("../infrastructure/repositories/user.repository.js");
async function getMatchmakingSuggestionsSV(_matchId, _limit) {
    const MATCH = await (0, match_repository_js_1.findMatchWithParticipantsRepo)(_matchId);
    if (!MATCH) {
        throw new app_error_js_1.AppError('PARTIDO_NO_ENCONTRADO', 'El partido indicado no existe.', 404);
    }
    const EXCLUDE_IDS = MATCH.participants.map((_p) => _p.userId);
    const CAP = Math.min(Math.max(_limit, 1), 50);
    const FROM_RANKING = await (0, ranking_repository_js_1.listRankingSuggestionsRepo)(MATCH.categoryId, EXCLUDE_IDS, CAP);
    const OUT = FROM_RANKING.map((_r) => ({
        userId: _r.userId,
        name: _r.name,
        source: 'ranking',
        points: _r.points,
    }));
    if (OUT.length >= CAP) {
        return OUT.slice(0, CAP);
    }
    const REMAINING = CAP - OUT.length;
    const ALREADY = new Set([...EXCLUDE_IDS, ...OUT.map((_o) => _o.userId)]);
    const FALLBACK = await (0, user_repository_js_1.listUsersNotInRepo)([...ALREADY], REMAINING);
    for (const _u of FALLBACK) {
        OUT.push({
            userId: _u.id,
            name: _u.name,
            source: 'directory',
        });
    }
    return OUT;
}

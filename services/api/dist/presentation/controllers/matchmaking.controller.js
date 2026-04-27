"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMatchmakingSuggestionsCON = getMatchmakingSuggestionsCON;
const matchmaking_service_js_1 = require("../../application/matchmaking.service.js");
const matchmaking_validation_js_1 = require("../validation/matchmaking.validation.js");
async function getMatchmakingSuggestionsCON(_req, _res) {
    const PARAMS = matchmaking_validation_js_1.MATCHMAKING_PARAMS_SCHEMA.parse(_req.params);
    const QUERY = matchmaking_validation_js_1.MATCHMAKING_QUERY_SCHEMA.parse(_req.query);
    const SUGGESTIONS = await (0, matchmaking_service_js_1.getMatchmakingSuggestionsSV)(PARAMS.matchId, QUERY.limit);
    _res.status(200).json({
        success: true,
        message: 'Sugerencias obtenidas correctamente.',
        data: { suggestions: SUGGESTIONS },
    });
}

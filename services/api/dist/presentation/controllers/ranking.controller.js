"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postRecalculateRankingCON = postRecalculateRankingCON;
const ranking_service_js_1 = require("../../application/ranking.service.js");
const ranking_validation_js_1 = require("../validation/ranking.validation.js");
async function postRecalculateRankingCON(_req, _res) {
    const PARAMS = ranking_validation_js_1.RECALCULATE_RANKING_PARAMS_SCHEMA.parse(_req.params);
    const RESULT = await (0, ranking_service_js_1.recalculateRankingSV)(PARAMS.categoryId);
    _res.status(200).json({
        success: true,
        message: 'Ranking recalculado correctamente.',
        data: RESULT,
    });
}

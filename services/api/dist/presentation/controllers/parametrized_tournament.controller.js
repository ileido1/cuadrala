"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postParametrizedTournamentCON = postParametrizedTournamentCON;
const parametrized_tournament_service_js_1 = require("../../application/parametrized_tournament.service.js");
const parametrized_tournament_validation_js_1 = require("../validation/parametrized_tournament.validation.js");
async function postParametrizedTournamentCON(_req, _res) {
    const BODY = parametrized_tournament_validation_js_1.CREATE_PARAMETRIZED_TOURNAMENT_BODY_SCHEMA.parse(_req.body);
    const INPUT = {
        name: BODY.name,
        categoryId: BODY.categoryId,
        sportId: BODY.sportId,
        formatPresetId: BODY.formatPresetId,
    };
    if (BODY.formatParameters !== undefined) {
        INPUT.formatParameters = BODY.formatParameters;
    }
    if (BODY.startsAt !== undefined) {
        INPUT.startsAt = new Date(BODY.startsAt);
    }
    const RESULT = await (0, parametrized_tournament_service_js_1.createParametrizedTournamentSV)(INPUT);
    _res.status(201).json({
        success: true,
        message: 'Torneo creado correctamente.',
        data: RESULT,
    });
}

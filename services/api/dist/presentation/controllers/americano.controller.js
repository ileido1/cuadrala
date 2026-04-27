"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postAmericanoCON = postAmericanoCON;
const americano_service_js_1 = require("../../application/americano.service.js");
const americano_validation_js_1 = require("../validation/americano.validation.js");
async function postAmericanoCON(_req, _res) {
    const BODY = americano_validation_js_1.CREATE_AMERICANO_BODY_SCHEMA.parse(_req.body);
    const INPUT = {
        categoryId: BODY.categoryId,
        participantUserIds: BODY.participantUserIds,
    };
    if (BODY.sportId !== undefined) {
        INPUT.sportId = BODY.sportId;
    }
    if (BODY.courtId !== undefined) {
        INPUT.courtId = BODY.courtId;
    }
    if (BODY.tournamentId !== undefined) {
        INPUT.tournamentId = BODY.tournamentId;
    }
    if (BODY.scheduledAt !== undefined) {
        INPUT.scheduledAt = new Date(BODY.scheduledAt);
    }
    const RESULT = await (0, americano_service_js_1.createAmericanoSV)(INPUT);
    _res.status(201).json({
        success: true,
        message: 'Americano creado correctamente.',
        data: RESULT,
    });
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postCreateMatchObligationsCON = postCreateMatchObligationsCON;
exports.patchConfirmTransactionManualCON = patchConfirmTransactionManualCON;
exports.getMatchTransactionsSummaryCON = getMatchTransactionsSummaryCON;
exports.patchUserSubscriptionCON = patchUserSubscriptionCON;
exports.getUserTransactionsCON = getUserTransactionsCON;
const monetization_service_js_1 = require("../../application/monetization.service.js");
const monetization_validation_js_1 = require("../validation/monetization.validation.js");
async function postCreateMatchObligationsCON(_req, _res) {
    const PARAMS = monetization_validation_js_1.MATCH_ID_PARAM_SCHEMA.parse(_req.params);
    const BODY = monetization_validation_js_1.CREATE_OBLIGATIONS_BODY_SCHEMA.parse(_req.body);
    const INPUT = {
        matchId: PARAMS.matchId,
        amountBasePerPerson: BODY.amountBasePerPerson,
    };
    if (BODY.participantUserIds !== undefined) {
        INPUT.participantUserIds = BODY.participantUserIds;
    }
    const RESULT = await (0, monetization_service_js_1.createMatchObligationsSV)(INPUT);
    _res.status(201).json({
        success: true,
        message: 'Obligaciones registradas correctamente.',
        data: RESULT,
    });
}
async function patchConfirmTransactionManualCON(_req, _res) {
    const PARAMS = monetization_validation_js_1.TRANSACTION_ID_PARAM_SCHEMA.parse(_req.params);
    const RESULT = await (0, monetization_service_js_1.confirmTransactionManualSV)(PARAMS.transactionId);
    _res.status(200).json({
        success: true,
        message: 'Pago confirmado correctamente.',
        data: RESULT,
    });
}
async function getMatchTransactionsSummaryCON(_req, _res) {
    const PARAMS = monetization_validation_js_1.MATCH_ID_PARAM_SCHEMA.parse(_req.params);
    const RESULT = await (0, monetization_service_js_1.getMatchTransactionsSummarySV)(PARAMS.matchId);
    _res.status(200).json({
        success: true,
        message: 'Resumen obtenido correctamente.',
        data: RESULT,
    });
}
async function patchUserSubscriptionCON(_req, _res) {
    const PARAMS = monetization_validation_js_1.USER_ID_PARAM_SCHEMA.parse(_req.params);
    const BODY = monetization_validation_js_1.UPDATE_SUBSCRIPTION_BODY_SCHEMA.parse(_req.body);
    const RESULT = await (0, monetization_service_js_1.updateUserSubscriptionSV)(PARAMS.userId, BODY.subscriptionType);
    _res.status(200).json({
        success: true,
        message: 'Suscripcion actualizada correctamente.',
        data: RESULT,
    });
}
async function getUserTransactionsCON(_req, _res) {
    const PARAMS = monetization_validation_js_1.USER_ID_PARAM_SCHEMA.parse(_req.params);
    const QUERY = monetization_validation_js_1.USER_TRANSACTIONS_QUERY_SCHEMA.parse(_req.query);
    const RESULT = await (0, monetization_service_js_1.listUserTransactionsSV)(PARAMS.userId, QUERY.limit);
    _res.status(200).json({
        success: true,
        message: 'Transacciones obtenidas correctamente.',
        data: RESULT,
    });
}

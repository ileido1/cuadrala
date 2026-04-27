"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSportsCON = getSportsCON;
exports.getTournamentFormatPresetsBySportCON = getTournamentFormatPresetsBySportCON;
const catalog_service_js_1 = require("../../application/catalog.service.js");
const catalog_validation_js_1 = require("../validation/catalog.validation.js");
async function getSportsCON(_req, _res) {
    const DATA = await (0, catalog_service_js_1.listSportsSV)();
    _res.status(200).json({
        success: true,
        message: 'Deportes obtenidos correctamente.',
        data: { sports: DATA },
    });
}
async function getTournamentFormatPresetsBySportCON(_req, _res) {
    const PARAMS = catalog_validation_js_1.SPORT_ID_PARAM_SCHEMA.parse(_req.params);
    const PRESETS = await (0, catalog_service_js_1.listFormatPresetsBySportSV)(PARAMS.sportId);
    _res.status(200).json({
        success: true,
        message: 'Formatos de torneo obtenidos correctamente.',
        data: { presets: PRESETS },
    });
}

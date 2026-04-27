"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listSportsSV = listSportsSV;
exports.listFormatPresetsBySportSV = listFormatPresetsBySportSV;
const format_preset_repository_js_1 = require("../infrastructure/repositories/format_preset.repository.js");
const sport_repository_js_1 = require("../infrastructure/repositories/sport.repository.js");
async function listSportsSV() {
    const ROWS = await (0, sport_repository_js_1.listSportsRepo)();
    return ROWS.map((_r) => ({
        id: _r.id,
        code: _r.code,
        name: _r.name,
    }));
}
async function listFormatPresetsBySportSV(_sportId) {
    const ROWS = await (0, format_preset_repository_js_1.listFormatPresetsBySportRepo)(_sportId);
    return ROWS.map((_r) => ({
        id: _r.id,
        sportId: _r.sportId,
        code: _r.code,
        name: _r.name,
        schemaVersion: _r.schemaVersion,
        defaultParameters: _r.defaultParameters,
    }));
}

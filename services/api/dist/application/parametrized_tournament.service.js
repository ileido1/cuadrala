"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createParametrizedTournamentSV = createParametrizedTournamentSV;
const app_error_js_1 = require("../domain/errors/app_error.js");
const format_preset_repository_js_1 = require("../infrastructure/repositories/format_preset.repository.js");
const category_repository_js_1 = require("../infrastructure/repositories/category.repository.js");
const sport_repository_js_1 = require("../infrastructure/repositories/sport.repository.js");
const tournament_repository_js_1 = require("../infrastructure/repositories/tournament.repository.js");
/** Crea un torneo con formato parametrizable (preset + parámetros opcionales). */
async function createParametrizedTournamentSV(_input) {
    const CATEGORY = await (0, category_repository_js_1.findCategoryByIdRepo)(_input.categoryId);
    if (!CATEGORY) {
        throw new app_error_js_1.AppError('CATEGORIA_NO_ENCONTRADA', 'La categoría indicada no existe.', 404);
    }
    const SPORT = await (0, sport_repository_js_1.findSportByIdRepo)(_input.sportId);
    if (!SPORT) {
        throw new app_error_js_1.AppError('DEPORTE_NO_ENCONTRADO', 'El deporte indicado no existe.', 404);
    }
    const PRESET = await (0, format_preset_repository_js_1.findFormatPresetByIdRepo)(_input.formatPresetId);
    if (!PRESET) {
        throw new app_error_js_1.AppError('FORMATO_NO_ENCONTRADO', 'El formato de torneo indicado no existe.', 404);
    }
    if (PRESET.sportId !== _input.sportId) {
        throw new app_error_js_1.AppError('FORMATO_DEPORTE_INVALIDO', 'El formato no pertenece al deporte seleccionado.', 400);
    }
    if (!PRESET.isActive) {
        throw new app_error_js_1.AppError('FORMATO_INACTIVO', 'El formato de torneo no está activo.', 400);
    }
    const CREATED = await (0, tournament_repository_js_1.createTournamentRepo)({
        name: _input.name,
        categoryId: _input.categoryId,
        sportId: _input.sportId,
        formatPresetId: _input.formatPresetId,
        presetSchemaVersion: PRESET.schemaVersion,
        ...(_input.formatParameters !== undefined
            ? { formatParameters: _input.formatParameters }
            : {}),
        ...(_input.startsAt !== undefined ? { startsAt: _input.startsAt } : {}),
    });
    return {
        tournamentId: CREATED.id,
        sportId: CREATED.sportId,
        formatPresetId: CREATED.formatPresetId,
        presetSchemaVersion: CREATED.presetSchemaVersion,
        status: CREATED.status,
    };
}

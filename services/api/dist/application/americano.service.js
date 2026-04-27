"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAmericanoSV = createAmericanoSV;
const app_error_js_1 = require("../domain/errors/app_error.js");
const category_repository_js_1 = require("../infrastructure/repositories/category.repository.js");
const format_preset_repository_js_1 = require("../infrastructure/repositories/format_preset.repository.js");
const match_repository_js_1 = require("../infrastructure/repositories/match.repository.js");
const sport_repository_js_1 = require("../infrastructure/repositories/sport.repository.js");
const tournament_repository_js_1 = require("../infrastructure/repositories/tournament.repository.js");
const court_repository_js_1 = require("../infrastructure/repositories/court.repository.js");
const user_repository_js_1 = require("../infrastructure/repositories/user.repository.js");
async function resolveSportFormatAndParametersSV(_input) {
    if (_input.tournamentId !== undefined) {
        const TOURNAMENT = await (0, tournament_repository_js_1.findTournamentByIdRepo)(_input.tournamentId);
        if (!TOURNAMENT) {
            throw new app_error_js_1.AppError('TORNEO_NO_ENCONTRADO', 'El torneo indicado no existe.', 404);
        }
        if (TOURNAMENT.categoryId !== _input.categoryId) {
            throw new app_error_js_1.AppError('TORNEO_CATEGORIA_INVALIDA', 'El torneo no pertenece a la categoría seleccionada.', 400);
        }
        if (_input.sportId !== undefined && _input.sportId !== TOURNAMENT.sportId) {
            throw new app_error_js_1.AppError('DEPORTE_TORNEO_CONFLICTO', 'El deporte enviado no coincide con el del torneo.', 400);
        }
        const OUT = {
            sportId: TOURNAMENT.sportId,
            formatPresetId: TOURNAMENT.formatPresetId,
        };
        if (TOURNAMENT.formatParameters !== null && TOURNAMENT.formatParameters !== undefined) {
            OUT.formatParameters = TOURNAMENT.formatParameters;
        }
        return OUT;
    }
    let RESOLVED_SPORT_ID;
    if (_input.sportId !== undefined) {
        const SPORT = await (0, sport_repository_js_1.findSportByIdRepo)(_input.sportId);
        if (!SPORT) {
            throw new app_error_js_1.AppError('DEPORTE_NO_ENCONTRADO', 'El deporte indicado no existe.', 404);
        }
        RESOLVED_SPORT_ID = SPORT.id;
    }
    else {
        const PADEL = await (0, sport_repository_js_1.findSportByCodeRepo)('PADEL');
        if (PADEL === null) {
            throw new app_error_js_1.AppError('DEPORTE_NO_CONFIGURADO', 'No hay deporte PADEL en el catálogo. Ejecute el seed de catálogo.', 500);
        }
        RESOLVED_SPORT_ID = PADEL.id;
    }
    const PRESET = await (0, format_preset_repository_js_1.findFormatPresetBySportAndCodeRepo)(RESOLVED_SPORT_ID, 'AMERICANO');
    if (PRESET === null) {
        throw new app_error_js_1.AppError('FORMATO_NO_CONFIGURADO', 'No existe el preset AMERICANO para el deporte seleccionado.', 500);
    }
    return {
        sportId: RESOLVED_SPORT_ID,
        formatPresetId: PRESET.id,
    };
}
async function createAmericanoSV(_input) {
    const CATEGORY = await (0, category_repository_js_1.findCategoryByIdRepo)(_input.categoryId);
    if (!CATEGORY) {
        throw new app_error_js_1.AppError('CATEGORIA_NO_ENCONTRADA', 'La categoría indicada no existe.', 404);
    }
    if (_input.courtId !== undefined) {
        const COURT = await (0, court_repository_js_1.findCourtByIdRepo)(_input.courtId);
        if (!COURT) {
            throw new app_error_js_1.AppError('CANCHA_NO_ENCONTRADA', 'La cancha indicada no existe.', 404);
        }
    }
    const UNIQUE_IDS = new Set(_input.participantUserIds);
    if (UNIQUE_IDS.size !== _input.participantUserIds.length) {
        throw new app_error_js_1.AppError('PARTICIPANTES_DUPLICADOS', 'No se permiten participantes duplicados.', 400);
    }
    const FOUND = await (0, user_repository_js_1.countUsersByIdsRepo)(_input.participantUserIds);
    if (FOUND !== _input.participantUserIds.length) {
        throw new app_error_js_1.AppError('USUARIOS_INVALIDOS', 'Uno o más participantes no existen.', 400);
    }
    const FORMAT = await resolveSportFormatAndParametersSV(_input);
    const CREATE_PAYLOAD = {
        categoryId: _input.categoryId,
        sportId: FORMAT.sportId,
        formatPresetId: FORMAT.formatPresetId,
        participantUserIds: _input.participantUserIds,
    };
    if (FORMAT.formatParameters !== undefined) {
        CREATE_PAYLOAD.formatParameters = FORMAT.formatParameters;
    }
    if (_input.courtId !== undefined) {
        CREATE_PAYLOAD.courtId = _input.courtId;
    }
    if (_input.tournamentId !== undefined) {
        CREATE_PAYLOAD.tournamentId = _input.tournamentId;
    }
    if (_input.scheduledAt !== undefined) {
        CREATE_PAYLOAD.scheduledAt = _input.scheduledAt;
    }
    const CREATED = await (0, match_repository_js_1.createMatchWithParticipantsRepo)(CREATE_PAYLOAD);
    return {
        matchId: CREATED.id,
        status: CREATED.status,
        type: CREATED.type,
        sportId: CREATED.sportId,
        formatPresetId: CREATED.formatPresetId ?? FORMAT.formatPresetId,
        participantCount: CREATED.participants.length,
    };
}

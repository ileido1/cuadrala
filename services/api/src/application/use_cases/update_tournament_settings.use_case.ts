import { AppError } from '../../domain/errors/app_error.js';
import type { AssertTournamentOrganizerAccessUseCase } from './assert_tournament_organizer_access.use_case.js';
import type { TournamentRepository } from '../../domain/ports/tournament_repository.js';
import type { CategoryRepository } from '../../domain/ports/category_repository.js';
import type { SportRepository } from '../../domain/ports/sport_repository.js';
import type { FormatPresetRepository } from '../../domain/ports/format_preset_repository.js';
import type { TournamentFormatParametersValidator } from '../../domain/ports/tournament_format_parameters_validator.js';

const STRUCTURAL = ['sportId', 'categoryId', 'formatPresetId', 'formatParameters', 'pairedRegistration'];
const EDITORIAL = ['name', 'startsAt', 'venueId', 'gender', 'inscriptionPrice', 'maxSlots', 'registrationClosesAt'];

export class UpdateTournamentSettingsUseCase {
  constructor(private readonly _repo: TournamentRepository, private readonly _access: AssertTournamentOrganizerAccessUseCase, private readonly _categories: CategoryRepository, private readonly _sports: SportRepository, private readonly _presets: FormatPresetRepository, private readonly _validator: TournamentFormatParametersValidator) {}

  async executeSV(_input: { tournamentId: string; actorUserId: string; settings: Record<string, unknown> }) {
    const CURRENT = await this._repo.findByIdSV(_input.tournamentId);
    if (CURRENT === null) throw new AppError('NO_ENCONTRADO', 'Torneo no encontrado.', 404);
    await this._access.executeSV({ actorUserId: _input.actorUserId, organizerUserId: CURRENT.organizerUserId, venueId: CURRENT.venueId });
    const KEYS = Object.keys(_input.settings);
    if (KEYS.some((key) => ![...STRUCTURAL, ...EDITORIAL].includes(key))) throw new AppError('VALIDACION_FALLIDA', 'Configuración no soportada.', 400);
    if (CURRENT.status !== 'DRAFT' && KEYS.some((key) => STRUCTURAL.includes(key))) throw new AppError('TORNEO_CONFIGURACION_BLOQUEADA', 'El formato del torneo ya no se puede modificar.', 409);
    if (CURRENT.hasSchedule || CURRENT.matchCount > 0) throw new AppError('TORNEO_CONFIGURACION_BLOQUEADA', 'El torneo ya tiene calendario o partidos.', 409);
    if (CURRENT.registrationCount > 0 && KEYS.some((key) => ['sportId', 'categoryId', 'formatPresetId', 'formatParameters', 'pairedRegistration', 'maxSlots'].includes(key))) throw new AppError('TORNEO_CONFIGURACION_INCOMPATIBLE', 'No se puede cambiar la configuración con inscripciones existentes.', 409);

    const SETTINGS = { ..._input.settings };
    if (SETTINGS.sportId !== undefined && await this._sports.findByIdSV(String(SETTINGS.sportId)) === null) throw new AppError('DEPORTE_NO_ENCONTRADO', 'El deporte indicado no existe.', 404);
    if (SETTINGS.categoryId !== undefined && await this._categories.findByIdAndSportIdSV(String(SETTINGS.categoryId), String(SETTINGS.sportId ?? CURRENT.sportId)) === null) throw new AppError('CATEGORIA_NO_ENCONTRADA', 'La categoría indicada no existe para el deporte.', 404);
    if (SETTINGS.formatPresetId !== undefined) {
      const PRESET = await this._presets.findByIdSV(String(SETTINGS.formatPresetId));
      if (PRESET === null) throw new AppError('FORMATO_NO_ENCONTRADO', 'El formato indicado no existe.', 404);
      if (PRESET.sportId !== String(SETTINGS.sportId ?? CURRENT.sportId)) throw new AppError('FORMATO_DEPORTE_INVALIDO', 'El formato no pertenece al deporte seleccionado.', 400);
      SETTINGS.presetSchemaVersion = PRESET.schemaVersion;
      if (SETTINGS.formatParameters !== undefined) SETTINGS.formatParameters = this._validator.validateAndNormalizeSV({ parametersSchema: PRESET.parametersSchema ?? [], formatParameters: SETTINGS.formatParameters });
    }
    if (SETTINGS.maxSlots !== undefined && SETTINGS.maxSlots !== null && Number(SETTINGS.maxSlots) < CURRENT.registrationCount) throw new AppError('TORNEO_CONFIGURACION_INCOMPATIBLE', 'El cupo no puede ser menor a las inscripciones existentes.', 409);
    if (this._repo.updateSettingsSV === undefined) throw new AppError('CONFIGURACION_NO_DISPONIBLE', 'La configuración del torneo no está disponible.', 500);
    const UPDATED = await this._repo.updateSettingsSV({ tournamentId: _input.tournamentId, settings: SETTINGS });
    return UPDATED;
  }
}

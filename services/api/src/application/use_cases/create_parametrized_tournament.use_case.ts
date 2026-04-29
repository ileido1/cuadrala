import { AppError } from '../../domain/errors/app_error.js';
import type { CategoryRepository } from '../../domain/ports/category_repository.js';
import type { FormatPresetRepository } from '../../domain/ports/format_preset_repository.js';
import type { SportRepository } from '../../domain/ports/sport_repository.js';
import type { TournamentRepository } from '../../domain/ports/tournament_repository.js';
import type { TournamentFormatParametersValidator } from '../../domain/ports/tournament_format_parameters_validator.js';

export type CreateParametrizedTournamentInput = {
  name: string;
  categoryId: string;
  sportId: string;
  formatPresetId?: string;
  formatPresetCode?: string;
  formatParameters?: unknown;
  startsAt?: Date;
};

export class CreateParametrizedTournamentUseCase {
  constructor(
    private readonly _categoryRepository: CategoryRepository,
    private readonly _sportRepository: SportRepository,
    private readonly _formatPresetRepository: FormatPresetRepository,
    private readonly _tournamentRepository: TournamentRepository,
    private readonly _tournamentFormatParametersValidator: TournamentFormatParametersValidator,
  ) {}

  async executeSV(_input: CreateParametrizedTournamentInput): Promise<{
    tournamentId: string;
    sportId: string;
    formatPresetId: string;
    presetSchemaVersion: number;
    status: string;
  }> {
    // MVP: para el contrato HTTP sin DB, validamos temprano si viene formatPresetCode (schemaVersion=1).
    if (_input.formatPresetCode !== undefined) {
      this._tournamentFormatParametersValidator.validateAndNormalizeSV({
        presetCode: _input.formatPresetCode,
        presetSchemaVersion: 1,
        formatParameters: _input.formatParameters,
      });
    }

    const CATEGORY = await this._categoryRepository.findByIdSV(_input.categoryId);
    if (!CATEGORY) {
      throw new AppError('CATEGORIA_NO_ENCONTRADA', 'La categoría indicada no existe.', 404);
    }

    const SPORT = await this._sportRepository.findByIdSV(_input.sportId);
    if (!SPORT) {
      throw new AppError('DEPORTE_NO_ENCONTRADO', 'El deporte indicado no existe.', 404);
    }

    const NOW = new Date();
    const PRESET =
      _input.formatPresetId !== undefined
        ? await this._formatPresetRepository.findByIdSV(_input.formatPresetId)
        : _input.formatPresetCode !== undefined
          ? await this._formatPresetRepository.findActiveBySportAndCodeSV(
              _input.sportId,
              _input.formatPresetCode,
              NOW,
            )
          : null;
    if (PRESET === null) {
      throw new AppError(
        'FORMATO_NO_ENCONTRADO',
        'El formato de torneo indicado no existe o no está vigente.',
        404,
      );
    }

    if (PRESET.sportId !== _input.sportId) {
      throw new AppError(
        'FORMATO_DEPORTE_INVALIDO',
        'El formato no pertenece al deporte seleccionado.',
        400,
      );
    }

    const NORMALIZED_FORMAT_PARAMETERS = this._tournamentFormatParametersValidator.validateAndNormalizeSV({
      presetCode: PRESET.code,
      presetSchemaVersion: PRESET.schemaVersion,
      formatParameters: _input.formatParameters,
    });

    const CREATED = await this._tournamentRepository.createTournamentSV({
      name: _input.name,
      categoryId: _input.categoryId,
      sportId: _input.sportId,
      formatPresetId: PRESET.id,
      presetSchemaVersion: PRESET.schemaVersion,
      ...(NORMALIZED_FORMAT_PARAMETERS !== undefined
        ? { formatParameters: NORMALIZED_FORMAT_PARAMETERS }
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
}


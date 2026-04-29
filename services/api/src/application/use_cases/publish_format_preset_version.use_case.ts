import { AppError } from '../../domain/errors/app_error.js';
import type { FormatPresetRepository } from '../../domain/ports/format_preset_repository.js';
import type { SportRepository } from '../../domain/ports/sport_repository.js';

export type PublishFormatPresetVersionInput = {
  sportId: string;
  code: string;
  name: string;
  schemaVersion: number;
  defaultParameters: unknown;
  effectiveFrom?: Date;
};

export class PublishFormatPresetVersionUseCase {
  constructor(
    private readonly _sportRepository: SportRepository,
    private readonly _formatPresetRepository: FormatPresetRepository,
  ) {}

  async executeSV(_input: PublishFormatPresetVersionInput) {
    const SPORT = await this._sportRepository.findByIdSV(_input.sportId);
    if (!SPORT) {
      throw new AppError('DEPORTE_NO_ENCONTRADO', 'El deporte indicado no existe.', 404);
    }

    if (_input.schemaVersion < 1) {
      throw new AppError('VALIDACION_FALLIDA', 'schemaVersion debe ser mayor o igual a 1.', 400);
    }

    const CREATED = await this._formatPresetRepository.publishNewVersionSV({
      sportId: _input.sportId,
      code: _input.code,
      name: _input.name,
      schemaVersion: _input.schemaVersion,
      defaultParameters: _input.defaultParameters,
      ...(_input.effectiveFrom !== undefined ? { effectiveFrom: _input.effectiveFrom } : {}),
    });

    return {
      presetId: CREATED.id,
      sportId: CREATED.sportId,
      code: CREATED.code,
      version: CREATED.version,
      schemaVersion: CREATED.schemaVersion,
      isActive: CREATED.isActive ?? true,
      effectiveFrom: CREATED.effectiveFrom,
      supersedesId: CREATED.supersedesId ?? null,
    };
  }
}


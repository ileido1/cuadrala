import { AppError } from '../../domain/errors/app_error.js';
import type { AmericanoMatchWriteRepository } from '../../domain/ports/americano_match_write_repository.js';
import type { CategoryRepository } from '../../domain/ports/category_repository.js';
import type { ICourtRepository } from '../../domain/ports/court_repository.js';
import type { FormatPresetRepository } from '../../domain/ports/format_preset_repository.js';
import type { SportRepository } from '../../domain/ports/sport_repository.js';
import type { TournamentRepository } from '../../domain/ports/tournament_repository.js';
import type { UserRepository } from '../../domain/ports/user_repository.js';

export type CreateAmericanoInput = {
  categoryId: string;
  sportId?: string;
  courtId?: string;
  tournamentId?: string;
  scheduledAt?: Date;
  participantUserIds: string[];
};

type ResolvedFormat = {
  sportId: string;
  formatPresetId: string;
  formatParameters?: unknown;
};

export class CreateAmericanoUseCase {
  constructor(
    private readonly _categoryRepository: CategoryRepository,
    private readonly _courtRepository: ICourtRepository,
    private readonly _userRepository: UserRepository,
    private readonly _tournamentRepository: TournamentRepository,
    private readonly _sportRepository: SportRepository,
    private readonly _formatPresetRepository: FormatPresetRepository,
    private readonly _americanoMatchWriteRepository: AmericanoMatchWriteRepository,
  ) {}

  async executeSV(_input: CreateAmericanoInput): Promise<{
    matchId: string;
    status: string;
    type: string;
    sportId: string;
    formatPresetId: string;
    participantCount: number;
  }> {
    const CATEGORY = await this._categoryRepository.findByIdSV(_input.categoryId);
    if (!CATEGORY) {
      throw new AppError('CATEGORIA_NO_ENCONTRADA', 'La categoría indicada no existe.', 404);
    }

    if (_input.courtId !== undefined) {
      const COURT = await this._courtRepository.findById(_input.courtId);
      if (!COURT) {
        throw new AppError('CANCHA_NO_ENCONTRADA', 'La cancha indicada no existe.', 404);
      }
    }

    const UNIQUE_IDS = new Set(_input.participantUserIds);
    if (UNIQUE_IDS.size !== _input.participantUserIds.length) {
      throw new AppError('PARTICIPANTES_DUPLICADOS', 'No se permiten participantes duplicados.', 400);
    }

    const FOUND = await this._userRepository.countByIdsSV(_input.participantUserIds);
    if (FOUND !== _input.participantUserIds.length) {
      throw new AppError('USUARIOS_INVALIDOS', 'Uno o más participantes no existen.', 400);
    }

    const FORMAT = await this.resolveSportFormatAndParametersSV(_input);

    const CREATE_PAYLOAD: Parameters<
      AmericanoMatchWriteRepository['createAmericanoMatchSV']
    >[0] = {
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

    const CREATED = await this._americanoMatchWriteRepository.createAmericanoMatchSV(
      CREATE_PAYLOAD,
    );

    return {
      matchId: CREATED.id,
      status: CREATED.status,
      type: CREATED.type,
      sportId: CREATED.sportId,
      formatPresetId: CREATED.formatPresetId ?? FORMAT.formatPresetId,
      participantCount: CREATED.participantCount,
    };
  }

  private async resolveSportFormatAndParametersSV(
    _input: CreateAmericanoInput,
  ): Promise<ResolvedFormat> {
    if (_input.tournamentId !== undefined) {
      const TOURNAMENT = await this._tournamentRepository.findByIdSV(_input.tournamentId);
      if (!TOURNAMENT) {
        throw new AppError('TORNEO_NO_ENCONTRADO', 'El torneo indicado no existe.', 404);
      }
      if (TOURNAMENT.categoryId !== _input.categoryId) {
        throw new AppError(
          'TORNEO_CATEGORIA_INVALIDA',
          'El torneo no pertenece a la categoría seleccionada.',
          400,
        );
      }
      if (_input.sportId !== undefined && _input.sportId !== TOURNAMENT.sportId) {
        throw new AppError(
          'DEPORTE_TORNEO_CONFLICTO',
          'El deporte enviado no coincide con el del torneo.',
          400,
        );
      }
      const OUT: ResolvedFormat = {
        sportId: TOURNAMENT.sportId,
        formatPresetId: TOURNAMENT.formatPresetId,
      };
      if (TOURNAMENT.formatParameters !== null && TOURNAMENT.formatParameters !== undefined) {
        OUT.formatParameters = TOURNAMENT.formatParameters;
      }
      return OUT;
    }

    let resolvedSportId: string;
    if (_input.sportId !== undefined) {
      const SPORT = await this._sportRepository.findByIdSV(_input.sportId);
      if (!SPORT) {
        throw new AppError('DEPORTE_NO_ENCONTRADO', 'El deporte indicado no existe.', 404);
      }
      resolvedSportId = SPORT.id;
    } else {
      const PADEL = await this._sportRepository.findByCodeSV('PADEL');
      if (PADEL === null) {
        throw new AppError(
          'DEPORTE_NO_CONFIGURADO',
          'No hay deporte PADEL en el catálogo. Ejecute el seed de catálogo.',
          500,
        );
      }
      resolvedSportId = PADEL.id;
    }

    const PRESET = await this._formatPresetRepository.findActiveBySportAndCodeSV(
      resolvedSportId,
      'AMERICANO',
      new Date(),
    );
    if (PRESET === null) {
      throw new AppError(
        'FORMATO_NO_CONFIGURADO',
        'No existe el preset AMERICANO para el deporte seleccionado.',
        500,
      );
    }

    return {
      sportId: resolvedSportId,
      formatPresetId: PRESET.id,
    };
  }
}

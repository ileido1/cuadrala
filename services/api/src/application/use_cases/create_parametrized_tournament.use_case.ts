import { AppError } from '../../domain/errors/app_error.js';
import type { CategoryRepository } from '../../domain/ports/category_repository.js';
import type { FormatPresetRepository } from '../../domain/ports/format_preset_repository.js';
import type { SportRepository } from '../../domain/ports/sport_repository.js';
import type { TournamentRepository } from '../../domain/ports/tournament_repository.js';
import type { TournamentFormatParametersValidator } from '../../domain/ports/tournament_format_parameters_validator.js';
import type { VenueRepository } from '../../domain/ports/venue_repository.js';
import type { VenueStaffRepository } from '../../domain/ports/venue_staff_repository.js';

export type CreateParametrizedTournamentInput = {
  name: string;
  categoryId: string;
  sportId: string;
  formatPresetId?: string;
  formatPresetCode?: string;
  formatParameters?: unknown;
  startsAt?: Date;
  organizerUserId?: string;
  /** `PUBLIC` (default) se lista en el catálogo; `PRIVATE` solo por link. */
  visibility?: 'PUBLIC' | 'PRIVATE';
  /** Sede del torneo. Habilita además el fallback de autorización por staff. */
  venueId?: string;
  /** Precio por jugador; `0` es "gratis declarado", ausente es "sin declarar". */
  inscriptionPrice?: number;
  /** Cupo máximo declarado por el organizador. */
  maxSlots?: number;
  /** Cierre informativo de la inscripción; la ventana real la manda `status`. */
  registrationClosesAt?: Date;
};

export class CreateParametrizedTournamentUseCase {
  constructor(
    private readonly _categoryRepository: CategoryRepository,
    private readonly _sportRepository: SportRepository,
    private readonly _formatPresetRepository: FormatPresetRepository,
    private readonly _tournamentRepository: TournamentRepository,
    private readonly _tournamentFormatParametersValidator: TournamentFormatParametersValidator,
    private readonly _venueRepository: VenueRepository,
    private readonly _venueStaffRepository: VenueStaffRepository,
  ) {}

  /**
   * Valida que quien crea el torneo pueda ponerle esa sede.
   *
   * `venueId` no es un dato de vitrina: `AssertTournamentOrganizerAccessUseCase`
   * trata al staff de la sede como organizador del torneo. Aceptarlo sin
   * permiso deja que cualquiera publique un torneo a nombre de un club ajeno
   * —el listado lo muestra con su `venueName`— y de paso le entregue el control
   * al staff de ese club. La ruta es `optionalAuth`, así que sin sesión no hay
   * a quién atribuirle la sede.
   */
  private async _assertVenueAuthoritySV(
    _venueId: string,
    _actorUserId: string | undefined,
  ): Promise<void> {
    if (_actorUserId === undefined) {
      throw new AppError(
        'NO_AUTORIZADO',
        'Se requiere iniciar sesión para asociar el torneo a una sede.',
        401,
      );
    }

    const VENUE = await this._venueRepository.findByIdSV(_venueId);
    if (VENUE === null) {
      throw new AppError('SEDE_NO_ENCONTRADA', 'La sede indicada no existe.', 404);
    }

    const IS_STAFF = await this._venueStaffRepository.isUserStaffOfVenueSV(
      _actorUserId,
      _venueId,
    );
    if (!IS_STAFF) {
      throw new AppError(
        'NO_AUTORIZADO',
        'No tienes permisos para crear torneos en esa sede.',
        403,
      );
    }
  }

  async executeSV(_input: CreateParametrizedTournamentInput): Promise<{
    tournamentId: string;
    sportId: string;
    formatPresetId: string;
    presetSchemaVersion: number;
    status: string;
  }> {
    if (_input.venueId !== undefined) {
      await this._assertVenueAuthoritySV(_input.venueId, _input.organizerUserId);
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
      parametersSchema: PRESET.parametersSchema ?? [],
      formatParameters: _input.formatParameters,
    });

    const CREATED = await this._tournamentRepository.createTournamentSV({
      name: _input.name,
      categoryId: _input.categoryId,
      sportId: _input.sportId,
      formatPresetId: PRESET.id,
      presetSchemaVersion: PRESET.schemaVersion,
      ...(_input.organizerUserId !== undefined
        ? { organizerUserId: _input.organizerUserId }
        : {}),
      ...(_input.visibility !== undefined ? { visibility: _input.visibility } : {}),
      ...(NORMALIZED_FORMAT_PARAMETERS !== undefined
        ? { formatParameters: NORMALIZED_FORMAT_PARAMETERS }
        : {}),
      ...(_input.startsAt !== undefined ? { startsAt: _input.startsAt } : {}),
      ...(_input.venueId !== undefined ? { venueId: _input.venueId } : {}),
      ...(_input.inscriptionPrice !== undefined
        ? { inscriptionPrice: _input.inscriptionPrice }
        : {}),
      ...(_input.maxSlots !== undefined ? { maxSlots: _input.maxSlots } : {}),
      ...(_input.registrationClosesAt !== undefined
        ? { registrationClosesAt: _input.registrationClosesAt }
        : {}),
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


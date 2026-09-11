import { AppError } from '../../domain/errors/app_error.js';
import type {
  ListTournamentsFiltersDTO,
  TournamentListItemDTO,
  TournamentQueryRepository,
  PageDTO,
} from '../../domain/ports/tournament_query_repository.js';

export type ListTournamentsUseCaseInput = {
  status?: 'DRAFT' | 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  sportId?: string;
  categoryId?: string;
  venueId?: string;
  startsAtFrom?: string;
  startsAtTo?: string;
  /** Coordenadas "lat,lng"; sin esto no se filtra ni se calcula distanceKm. */
  near?: string;
  /** Radio en km cuando `near` está presente. Sin declarar, cae al default del caso de uso. */
  radiusKm?: number;
  page: number;
  limit: number;
};

export class ListTournamentsUseCase {
  constructor(
    private readonly _tournamentQueryRepository: TournamentQueryRepository,
    private readonly _defaultRadiusKm: number = 10,
  ) {}

  async executeSV(_input: ListTournamentsUseCaseInput): Promise<{
    items: TournamentListItemDTO[];
    pageInfo: { page: number; limit: number; total: number };
  }> {
    if (_input.page < 1) {
      throw new AppError('PAGINACION_INVALIDA', 'page debe ser mayor o igual a 1.', 400);
    }
    if (_input.limit < 1 || _input.limit > 100) {
      throw new AppError('PAGINACION_INVALIDA', 'limit debe estar entre 1 y 100.', 400);
    }

    const FILTERS: ListTournamentsFiltersDTO = {
      ...(_input.status !== undefined ? { status: _input.status } : {}),
      ...(_input.sportId !== undefined ? { sportId: _input.sportId } : {}),
      ...(_input.categoryId !== undefined ? { categoryId: _input.categoryId } : {}),
      ...(_input.venueId !== undefined ? { venueId: _input.venueId } : {}),
      ...(_input.startsAtFrom !== undefined ? { startsAtFrom: _input.startsAtFrom } : {}),
      ...(_input.startsAtTo !== undefined ? { startsAtTo: _input.startsAtTo } : {}),
      ...(_input.near !== undefined ? { near: this._parseNearSV(_input.near, _input.radiusKm) } : {}),
    };
    const PAGE: PageDTO = { page: _input.page, limit: _input.limit };

    const { items, total } = await this._tournamentQueryRepository.listTournamentsSV(FILTERS, PAGE);
    return { items, pageInfo: { page: _input.page, limit: _input.limit, total } };
  }

  private _parseNearSV(
    _near: string,
    _radiusKm: number | undefined,
  ): { lat: number; lng: number; radiusKm: number } {
    const [LAT_STR, LNG_STR] = _near.split(',');
    return {
      lat: Number(LAT_STR),
      lng: Number(LNG_STR),
      radiusKm: _radiusKm ?? this._defaultRadiusKm,
    };
  }
}
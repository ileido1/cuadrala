import { AppError } from '../../domain/errors/app_error.js';
import type {
  ListVenueMatchesFiltersDTO,
  MatchListItemDTO,
  MatchQueryRepository,
  PageDTO,
} from '../../domain/ports/match_query_repository.js';

export type ListVenueMatchesUseCaseInput = {
  venueId: string;
  courtId?: string;
  date?: string;
  status?: 'SCHEDULED' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED';
  page: number;
  limit: number;
};

export type VenueMatchListItemDTO = MatchListItemDTO & {
  courtId: string | null;
  courtName: string | null;
};

export class ListVenueMatchesUseCase {
  constructor(private readonly _matchQueryRepository: MatchQueryRepository) {}

  async executeSV(_input: ListVenueMatchesUseCaseInput): Promise<{
    items: VenueMatchListItemDTO[];
    pageInfo: { page: number; limit: number; total: number };
  }> {
    if (_input.page < 1) {
      throw new AppError(
        'PAGINACION_INVALIDA',
        'page debe ser mayor o igual a 1.',
        400,
      );
    }
    if (_input.limit < 1 || _input.limit > 100) {
      throw new AppError(
        'PAGINACION_INVALIDA',
        'limit debe estar entre 1 y 100.',
        400,
      );
    }

    if (_input.date !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(_input.date)) {
      throw new AppError(
        'VALIDACION_FALLIDA',
        'date debe estar en formato YYYY-MM-DD.',
        400,
      );
    }

    const FILTERS: ListVenueMatchesFiltersDTO = {
      ...(_input.courtId !== undefined ? { courtId: _input.courtId } : {}),
      ...(_input.date !== undefined ? { date: _input.date } : {}),
      ...(_input.status !== undefined ? { status: _input.status } : {}),
    };
    const PAGE: PageDTO = { page: _input.page, limit: _input.limit };

    const { items, total } = await this._matchQueryRepository.listMatchesByVenueSV(
      _input.venueId,
      FILTERS,
      PAGE,
    );

    return { items, pageInfo: { page: _input.page, limit: _input.limit, total } };
  }
}

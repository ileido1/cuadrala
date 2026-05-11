import { AppError } from '../../domain/errors/app_error.js';
import type {
  ListTournamentsFiltersDTO,
  TournamentListItemDTO,
  TournamentQueryRepository,
  PageDTO,
} from '../../domain/ports/tournament_query_repository.js';

export type ListTournamentsByVenueUseCaseInput = {
  venueId: string;
  status?: 'DRAFT' | 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  sportId?: string;
  categoryId?: string;
  page: number;
  limit: number;
};

export class ListTournamentsByVenueUseCase {
  constructor(private readonly _tournamentQueryRepository: TournamentQueryRepository) {}

  async executeSV(_input: ListTournamentsByVenueUseCaseInput): Promise<{
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
    };
    const PAGE: PageDTO = { page: _input.page, limit: _input.limit };

    const { items, total } = await this._tournamentQueryRepository.listTournamentsByVenueSV(
      _input.venueId,
      FILTERS,
      PAGE,
    );
    return { items, pageInfo: { page: _input.page, limit: _input.limit, total } };
  }
}

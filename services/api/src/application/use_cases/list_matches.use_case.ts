import { AppError } from '../../domain/errors/app_error.js';
import type {
  ListMatchesFiltersDTO,
  MatchListItemDTO,
  MatchQueryRepository,
  PageDTO,
} from '../../domain/ports/match_query_repository.js';

export type ListMatchesUseCaseInput = {
  sportId?: string;
  categoryId?: string;
  status?: 'SCHEDULED' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED';
  scheduledFrom?: Date;
  scheduledTo?: Date;
  page: number;
  limit: number;
};

export class ListMatchesUseCase {
  constructor(private readonly _matchQueryRepository: MatchQueryRepository) {}

  async executeSV(_input: ListMatchesUseCaseInput): Promise<{
    items: MatchListItemDTO[];
    pageInfo: { page: number; limit: number; total: number };
  }> {
    if (_input.page < 1) {
      throw new AppError('PAGINACION_INVALIDA', 'page debe ser mayor o igual a 1.', 400);
    }
    if (_input.limit < 1 || _input.limit > 100) {
      throw new AppError('PAGINACION_INVALIDA', 'limit debe estar entre 1 y 100.', 400);
    }

    const FILTERS: ListMatchesFiltersDTO = {
      ...(_input.sportId !== undefined ? { sportId: _input.sportId } : {}),
      ...(_input.categoryId !== undefined ? { categoryId: _input.categoryId } : {}),
      ...(_input.status !== undefined ? { status: _input.status } : {}),
      ...(_input.scheduledFrom !== undefined ? { scheduledFrom: _input.scheduledFrom } : {}),
      ...(_input.scheduledTo !== undefined ? { scheduledTo: _input.scheduledTo } : {}),
    };
    const PAGE: PageDTO = { page: _input.page, limit: _input.limit };

    const { items, total } = await this._matchQueryRepository.listMatchesSV(FILTERS, PAGE);
    return { items, pageInfo: { page: _input.page, limit: _input.limit, total } };
  }
}


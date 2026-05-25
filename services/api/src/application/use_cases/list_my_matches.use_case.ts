import { AppError } from '../../domain/errors/app_error.js';
import type {
  ListMyMatchesFiltersDTO,
  MatchListItemDTO,
  MatchQueryRepository,
  MatchStatus,
  PageDTO,
} from '../../domain/ports/match_query_repository.js';

export type ListMyMatchesInput = {
  userId: string;
  statuses?: MatchStatus[];
  role?: 'CREATOR' | 'PARTICIPANT' | 'ANY';
  scheduledFrom?: Date;
  scheduledTo?: Date;
  page: number;
  limit: number;
};

export class ListMyMatchesUseCase {
  constructor(private readonly _matchQueryRepository: MatchQueryRepository) {}

  async executeSV(_input: ListMyMatchesInput): Promise<{
    items: MatchListItemDTO[];
    pageInfo: { page: number; limit: number; total: number };
  }> {
    if (_input.page < 1) {
      throw new AppError('PAGINACION_INVALIDA', 'page debe ser mayor o igual a 1.', 400);
    }
    if (_input.limit < 1 || _input.limit > 100) {
      throw new AppError('PAGINACION_INVALIDA', 'limit debe estar entre 1 y 100.', 400);
    }

    const FILTERS: ListMyMatchesFiltersDTO = {
      ...(_input.statuses !== undefined ? { statuses: _input.statuses } : {}),
      ...(_input.role !== undefined ? { role: _input.role } : {}),
      ...(_input.scheduledFrom !== undefined ? { scheduledFrom: _input.scheduledFrom } : {}),
      ...(_input.scheduledTo !== undefined ? { scheduledTo: _input.scheduledTo } : {}),
    };
    const PAGE: PageDTO = { page: _input.page, limit: _input.limit };

    const { items, total } = await this._matchQueryRepository.listMyMatchesSV(
      _input.userId,
      FILTERS,
      PAGE,
    );
    return { items, pageInfo: { page: _input.page, limit: _input.limit, total } };
  }
}

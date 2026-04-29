import { AppError } from '../../domain/errors/app_error.js';
import type {
  MatchListFiltersDTO,
  MatchRepository,
  OpenMatchDTO,
  PageDTO,
} from '../../domain/ports/match_repository.js';

export type ListOpenMatchesInput = MatchListFiltersDTO &
  PageDTO & {
    sportId: string;
  };

export class ListOpenMatchesUseCase {
  constructor(private readonly _matchRepository: MatchRepository) {}

  async executeSV(_input: ListOpenMatchesInput): Promise<{
    items: OpenMatchDTO[];
    pageInfo: { page: number; limit: number; total: number };
  }> {
    if (_input.page < 1) {
      throw new AppError('PAGINACION_INVALIDA', 'page debe ser mayor o igual a 1.', 400);
    }
    if (_input.limit < 1 || _input.limit > 100) {
      throw new AppError('PAGINACION_INVALIDA', 'limit debe estar entre 1 y 100.', 400);
    }

    const { items, total } = await this._matchRepository.listOpenMatchesSV(
      {
        sportId: _input.sportId,
        status: 'SCHEDULED',
        ...(_input.categoryId !== undefined ? { categoryId: _input.categoryId } : {}),
        ...(_input.scheduledFrom !== undefined ? { scheduledFrom: _input.scheduledFrom } : {}),
        ...(_input.scheduledTo !== undefined ? { scheduledTo: _input.scheduledTo } : {}),
        ...(_input.minPricePerPlayerCents !== undefined ? { minPricePerPlayerCents: _input.minPricePerPlayerCents } : {}),
        ...(_input.maxPricePerPlayerCents !== undefined ? { maxPricePerPlayerCents: _input.maxPricePerPlayerCents } : {}),
        ...(_input.nearLat !== undefined ? { nearLat: _input.nearLat } : {}),
        ...(_input.nearLng !== undefined ? { nearLng: _input.nearLng } : {}),
        ...(_input.radiusKm !== undefined ? { radiusKm: _input.radiusKm } : {}),
      },
      { page: _input.page, limit: _input.limit },
    );

    return { items, pageInfo: { page: _input.page, limit: _input.limit, total } };
  }
}


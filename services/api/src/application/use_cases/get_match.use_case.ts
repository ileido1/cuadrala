import { AppError } from '../../domain/errors/app_error.js';
import type { MatchQueryRepository } from '../../domain/ports/match_query_repository.js';
import type { MatchDetailDTO } from '../../domain/ports/match_query_repository.js';

export class GetMatchUseCase {
  constructor(private readonly _matchQueryRepository: MatchQueryRepository) {}

  async executeSV(_matchId: string): Promise<MatchDetailDTO> {
    const MATCH = await this._matchQueryRepository.getMatchByIdSV(_matchId);
    if (MATCH === null) {
      throw new AppError('PARTIDO_NO_ENCONTRADO', 'El partido indicado no existe.', 404);
    }
    return MATCH;
  }
}


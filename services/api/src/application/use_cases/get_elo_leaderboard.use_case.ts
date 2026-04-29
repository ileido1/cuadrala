import { AppError } from '../../domain/errors/app_error.js';
import type { UserRatingLeaderboardReadRepository } from '../../domain/ports/user_rating_leaderboard_read_repository.js';

export type GetEloLeaderboardUseCaseInputDTO = {
  categoryId: string;
  limit: number;
};

export class GetEloLeaderboardUseCase {
  constructor(private readonly _leaderboardRepository: UserRatingLeaderboardReadRepository) {}

  async executeSV(_input: GetEloLeaderboardUseCaseInputDTO) {
    if (_input.limit <= 0 || _input.limit > 200) {
      throw new AppError('VALIDACION_FALLIDA', 'limit debe estar entre 1 y 200.', 400);
    }
    return await this._leaderboardRepository.listLeaderboardByCategorySV(_input);
  }
}


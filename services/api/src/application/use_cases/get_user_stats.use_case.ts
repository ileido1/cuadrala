import { AppError } from '../../domain/errors/app_error.js';
import type { UserStatsDTO, UserStatsRepository } from '../../domain/ports/user_stats_repository.js';

export class GetUserStatsUseCase {
  public constructor(private readonly _userStatsRepository: UserStatsRepository) {}

  async executeSV(_userId: string): Promise<UserStatsDTO> {
    const STATS = await this._userStatsRepository.getUserStatsSV(_userId);
    if (STATS === null) {
      throw new AppError('USUARIO_NO_ENCONTRADO', 'El usuario indicado no existe.', 404);
    }
    return STATS;
  }
}


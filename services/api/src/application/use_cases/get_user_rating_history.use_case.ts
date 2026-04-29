import { AppError } from '../../domain/errors/app_error.js';
import type {
  PaginatedUserRatingHistoryDTO,
  UserRatingReadRepository,
} from '../../domain/ports/user_rating_read_repository.js';

export class GetUserRatingHistoryUseCase {
  public constructor(private readonly _userRatingReadRepository: UserRatingReadRepository) {}

  async executeSV(_params: {
    userId: string;
    categoryId?: string;
    page: number;
    limit: number;
  }): Promise<PaginatedUserRatingHistoryDTO> {
    const RESULT = await this._userRatingReadRepository.getUserRatingHistorySV(_params);

    if (RESULT === null) {
      throw new AppError('USUARIO_NO_ENCONTRADO', 'El usuario indicado no existe.', 404);
    }

    return RESULT;
  }
}


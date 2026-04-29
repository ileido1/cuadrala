import { AppError } from '../../domain/errors/app_error.js';
import type {
  UserRatingReadRepository,
  UserRatingReadRowDTO,
} from '../../domain/ports/user_rating_read_repository.js';

export class GetUserRatingsUseCase {
  public constructor(private readonly _userRatingReadRepository: UserRatingReadRepository) {}

  async executeSV(_params: {
    userId: string;
    categoryId?: string;
  }): Promise<{ items: UserRatingReadRowDTO[] }> {
    const ITEMS = await this._userRatingReadRepository.getUserRatingsSV(_params.userId, _params.categoryId);

    if (ITEMS === null) {
      throw new AppError('USUARIO_NO_ENCONTRADO', 'El usuario indicado no existe.', 404);
    }

    return { items: ITEMS };
  }
}


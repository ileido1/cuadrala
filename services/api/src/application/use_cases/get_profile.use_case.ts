import { AppError } from '../../domain/errors/app_error.js';
import type {
  PrimaryUserRatingDTO,
  UserRatingReadRepository,
} from '../../domain/ports/user_rating_read_repository.js';
import type { UserRepository } from '../../domain/ports/user_repository.js';

export class GetProfileUseCase {
  constructor(
    private readonly _userRepository: UserRepository,
    private readonly _userRatingReadRepository: UserRatingReadRepository,
  ) {}

  async executeSV(_userId: string): Promise<{
    id: string;
    email: string;
    name: string;
    subscriptionType: string;
    primaryRating: PrimaryUserRatingDTO | null;
    createdAt: Date;
    updatedAt: Date;
  }> {
    const USER = await this._userRepository.findByIdSV(_userId);
    if (USER === null) {
      throw new AppError('USUARIO_NO_ENCONTRADO', 'Usuario no encontrado.', 404);
    }

    // Resumen de nivel (categoría + ELO) para el chip de Home. Degrada a `null`
    // cuando el jugador aún no tiene ratings.
    const PRIMARY_RATING = await this._userRatingReadRepository.getPrimaryUserRatingSV(_userId);

    return {
      id: USER.id,
      email: USER.email,
      name: USER.name,
      subscriptionType: USER.subscriptionType,
      primaryRating: PRIMARY_RATING,
      createdAt: USER.createdAt,
      updatedAt: USER.updatedAt,
    };
  }
}


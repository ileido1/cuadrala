import { AppError } from '../../domain/errors/app_error.js';
import type { UserRepository } from '../../domain/ports/user_repository.js';

export class GetProfileUseCase {
  constructor(private readonly _userRepository: UserRepository) {}

  async executeSV(_userId: string): Promise<{
    id: string;
    email: string;
    name: string;
    subscriptionType: string;
    createdAt: Date;
    updatedAt: Date;
  }> {
    const USER = await this._userRepository.findByIdSV(_userId);
    if (USER === null) {
      throw new AppError('USUARIO_NO_ENCONTRADO', 'Usuario no encontrado.', 404);
    }

    return {
      id: USER.id,
      email: USER.email,
      name: USER.name,
      subscriptionType: USER.subscriptionType,
      createdAt: USER.createdAt,
      updatedAt: USER.updatedAt,
    };
  }
}


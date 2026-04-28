import { AppError } from '../../domain/errors/app_error.js';
import type { UserRepository } from '../../domain/ports/user_repository.js';

export class UpdateProfileUseCase {
  constructor(private readonly _userRepository: UserRepository) {}

  async executeSV(
    _userId: string,
    _name: string | undefined,
  ): Promise<{
    id: string;
    email: string;
    name: string;
    subscriptionType: string;
    createdAt: Date;
    updatedAt: Date;
  }> {
    if (_name === undefined) {
      const USER = await this._userRepository.findByIdSV(_userId);
      if (USER === null) {
        throw new AppError('USUARIO_NO_ENCONTRADO', 'Usuario no encontrado.', 404);
      }
      return USER;
    }

    const USER = await this._userRepository.updateUserNameSV(_userId, _name.trim());
    return USER;
  }
}


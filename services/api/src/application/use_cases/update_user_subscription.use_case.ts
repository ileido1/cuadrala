import { AppError } from '../../domain/errors/app_error.js';
import type { UserSubscriptionRepository } from '../../domain/ports/user_subscription_repository.js';

export class UpdateUserSubscriptionUseCase {
  constructor(private readonly _userRepository: UserSubscriptionRepository) {}

  async executeSV(
    _userId: string,
    _subscriptionType: 'FREE' | 'PRO',
  ): Promise<{ userId: string; subscriptionType: string }> {
    const EXISTS = await this._userRepository.existsSV(_userId);
    if (!EXISTS) {
      throw new AppError('USUARIO_NO_ENCONTRADO', 'El usuario indicado no existe.', 404);
    }
    return this._userRepository.updateSubscriptionSV(_userId, _subscriptionType);
  }
}

import { AppError } from '../../domain/errors/app_error.js';
import type { NotificationSubscriptionRepository } from '../../domain/ports/notification_subscription_repository.js';

export class DisableMyNotificationSubscriptionUseCase {
  constructor(private readonly _notificationSubscriptionRepository: NotificationSubscriptionRepository) {}

  async executeSV(_actorUserId: string, _subscriptionId: string): Promise<void> {
    const DISABLED = await this._notificationSubscriptionRepository.disableByIdForUserSV(
      _subscriptionId,
      _actorUserId,
    );
    if (!DISABLED) {
      throw new AppError('RECURSO_NO_ENCONTRADO', 'La suscripcion indicada no existe.', 404);
    }
  }
}


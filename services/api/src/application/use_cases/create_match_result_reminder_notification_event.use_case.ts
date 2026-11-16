import type { NotificationDeliveryRepository } from '../../domain/ports/notification_delivery_repository.js';
import type { NotificationEventRepository } from '../../domain/ports/notification_event_repository.js';
import type { NotificationSubscriptionRepository } from '../../domain/ports/notification_subscription_repository.js';

/**
 * @name    :CreateMatchResultReminderNotificationEventUseCase
 * @version :1.0.0
 * @description :Pide a los participantes que carguen el resultado de una partida
 *               que terminó por el bloque de cancha. Respeta las preferencias de
 *               cada usuario; si nadie lo quiere recibir no crea el evento.
 */
export class CreateMatchResultReminderNotificationEventUseCase {
  constructor(
    private readonly _notificationEventRepository: NotificationEventRepository,
    private readonly _notificationDeliveryRepository: NotificationDeliveryRepository,
    private readonly _notificationSubscriptionRepository: NotificationSubscriptionRepository,
  ) {}

  async executeSV(_dto: { matchId: string; categoryId: string; userIds: string[] }): Promise<void> {
    //? 1. Filtrar a quienes apagaron este tipo de aviso
    const USER_IDS = await this._notificationSubscriptionRepository.filterEnabledUserIdsForEventSV(
      [...new Set(_dto.userIds)],
      'MATCH_RESULT_REMINDER',
    );
    if (USER_IDS.length === 0) return;

    //? 2. Evento con `matchId` (columna y payload) para que el cliente abra la carga del resultado
    const EVENT = await this._notificationEventRepository.createMatchResultReminderSV({
      matchId: _dto.matchId,
      categoryId: _dto.categoryId,
      payload: { kind: 'MATCH_RESULT_REMINDER', matchId: _dto.matchId },
    });

    //? 3. Un delivery por participante (único por evento + usuario)
    await this._notificationDeliveryRepository.createManyIdempotentSV(
      USER_IDS.map((_userId) => ({ eventId: EVENT.id, userId: _userId, status: 'PENDING', error: null, sentAt: null })),
    );
  }
}

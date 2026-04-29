import { AppError } from '../../domain/errors/app_error.js';
import type {
  NotificationSubscriptionDTO,
  NotificationSubscriptionRepository,
} from '../../domain/ports/notification_subscription_repository.js';

export type UpsertMyNotificationSubscriptionInputDTO = {
  id?: string;
  actorUserId: string;
  categoryId: string | null;
  nearLat: number | null;
  nearLng: number | null;
  radiusKm: number | null;
  enabled: boolean;
  enabledTypes?: unknown | null;
};

export class UpsertMyNotificationSubscriptionUseCase {
  constructor(private readonly _notificationSubscriptionRepository: NotificationSubscriptionRepository) {}

  async executeSV(_input: UpsertMyNotificationSubscriptionInputDTO): Promise<NotificationSubscriptionDTO> {
    const HAS_GEO =
      _input.nearLat !== null || _input.nearLng !== null || _input.radiusKm !== null;
    const HAS_ALL_GEO =
      _input.nearLat !== null && _input.nearLng !== null && _input.radiusKm !== null;

    if (HAS_GEO && !HAS_ALL_GEO) {
      throw new AppError(
        'VALIDACION_FALLIDA',
        'nearLat, nearLng y radiusKm deben venir juntos.',
        400,
      );
    }

    try {
      return await this._notificationSubscriptionRepository.upsertSV({
        id: _input.id,
        userId: _input.actorUserId,
        categoryId: _input.categoryId,
        nearLat: _input.nearLat,
        nearLng: _input.nearLng,
        radiusKm: _input.radiusKm,
        enabled: _input.enabled,
        enabledTypes: _input.enabledTypes,
      });
    } catch (_error) {
      if (_error instanceof Error && _error.message === 'SUBSCRIPCION_NO_ENCONTRADA') {
        throw new AppError('RECURSO_NO_ENCONTRADO', 'La suscripcion indicada no existe.', 404);
      }
      throw _error;
    }
  }
}


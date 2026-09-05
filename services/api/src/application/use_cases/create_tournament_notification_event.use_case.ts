import type { NotificationDeliveryRepository } from '../../domain/ports/notification_delivery_repository.js';
import type { NotificationEventRepository } from '../../domain/ports/notification_event_repository.js';
import type { TournamentNotificationEventType } from '../../domain/notifications/tournament_notification_events.js';

/**
 * Alta de un evento de torneo y sus entregas.
 *
 * Un solo caso de uso para los cuatro momentos, en vez de uno por tipo como en
 * los eventos de partido: lo único que cambia entre ellos es el tipo y a quién
 * le llega, y ambas cosas son datos.
 *
 * La audiencia siempre viene dada por quien dispara el evento —el organizador,
 * o los inscriptos confirmados—, nunca por proximidad geográfica: acá ya se
 * sabe a quién le importa.
 */
export class CreateTournamentNotificationEventUseCase {
  constructor(
    private readonly _notificationEventRepository: NotificationEventRepository,
    private readonly _notificationDeliveryRepository: NotificationDeliveryRepository,
  ) {}

  async executeSV(_dto: {
    type: TournamentNotificationEventType;
    tournamentId: string;
    categoryId: string;
    payload: unknown;
    userIds: string[];
  }): Promise<{ eventId: string | null; createdDeliveries: number }> {
    //? Sin destinatarios no se crea el evento: un evento sin entregas queda
    //? pendiente para siempre y ensucia el backlog del despachador.
    const RECIPIENTS = [...new Set(_dto.userIds)];
    if (RECIPIENTS.length === 0) {
      return { eventId: null, createdDeliveries: 0 };
    }

    const EVENT = await this._notificationEventRepository.createTournamentEventSV({
      type: _dto.type,
      tournamentId: _dto.tournamentId,
      categoryId: _dto.categoryId,
      payload: _dto.payload,
    });

    const CREATED = await this._notificationDeliveryRepository.createManyIdempotentSV(
      RECIPIENTS.map((_userId) => ({
        eventId: EVENT.id,
        userId: _userId,
        status: 'PENDING',
        error: null,
        sentAt: null,
        attemptCount: 0,
        nextAttemptAt: null,
        lastAttemptAt: null,
        lastErrorCode: null,
      })),
    );

    return { eventId: EVENT.id, createdDeliveries: CREATED.createdCount };
  }
}

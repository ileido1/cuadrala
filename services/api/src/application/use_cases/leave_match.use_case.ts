import { AppError } from '../../domain/errors/app_error.js';
import type { MatchParticipationRepository } from '../../domain/ports/match_participation_repository.js';
import type { MatchReadRepository } from '../../domain/ports/match_read_repository.js';
import type { MatchNotificationContextReadRepository } from '../../domain/ports/match_notification_context_read_repository.js';
import type { NotificationEventRepository } from '../../domain/ports/notification_event_repository.js';

export class LeaveMatchUseCase {
  constructor(
    private readonly _matchReadRepository: MatchReadRepository,
    private readonly _matchParticipationRepository: MatchParticipationRepository,
    private readonly _matchNotificationContextReadRepository: MatchNotificationContextReadRepository,
    private readonly _notificationEventRepository: NotificationEventRepository,
  ) {}

  async executeSV(_matchId: string, _userId: string): Promise<void> {
    const MATCH = await this._matchReadRepository.findByIdSV(_matchId);
    if (MATCH === null) {
      throw new AppError('PARTIDO_NO_ENCONTRADO', 'El partido indicado no existe.', 404);
    }

    if (MATCH.status !== 'SCHEDULED') {
      throw new AppError(
        'PARTIDO_NO_ABIERTO',
        'No puedes salir de un partido que no está en estado programado.',
        409,
      );
    }

    const COUNT_BEFORE = await this._matchParticipationRepository.countParticipantsSV(_matchId);
    const REMOVED = await this._matchParticipationRepository.removeParticipantSV(_matchId, _userId);
    if (REMOVED.removedCount === 0) {
      return;
    }
    const COUNT_AFTER = await this._matchParticipationRepository.countParticipantsSV(_matchId);

    const OPENED_SLOT =
      COUNT_BEFORE >= MATCH.maxParticipants && COUNT_AFTER < MATCH.maxParticipants;
    if (!OPENED_SLOT) {
      return;
    }

    const CONTEXT = await this._matchNotificationContextReadRepository.getByMatchIdSV(_matchId);
    if (CONTEXT === null) {
      return;
    }

    await this._notificationEventRepository.createMatchSlotOpenedSV({
      matchId: _matchId,
      categoryId: MATCH.categoryId,
      payload: {
        matchId: _matchId,
        categoryId: MATCH.categoryId,
        venueLat: CONTEXT.venueLat,
        venueLng: CONTEXT.venueLng,
      },
    });
  }
}


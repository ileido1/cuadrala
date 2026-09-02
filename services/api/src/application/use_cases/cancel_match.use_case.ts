import { AppError } from '../../domain/errors/app_error.js';
import type { MatchCrudRepository } from '../../domain/ports/match_crud_repository.js';
import type { MatchOrganizerRepository } from '../../domain/ports/match_organizer_repository.js';
import type { MatchQueryRepository } from '../../domain/ports/match_query_repository.js';
import type { MatchParticipationRepository } from '../../domain/ports/match_participation_repository.js';
import type { MatchDetailDTO } from '../../domain/ports/match_crud_repository.js';
import type { CreateMatchCancelledNotificationEventUseCase } from './create_match_cancelled_notification_event.use_case.js';

export class CancelMatchUseCase {
  constructor(
    private readonly _matchQueryRepository: MatchQueryRepository,
    private readonly _matchOrganizerRepository: MatchOrganizerRepository,
    private readonly _matchCrudRepository: MatchCrudRepository,
    private readonly _matchParticipationRepository: MatchParticipationRepository | null = null,
    private readonly _createMatchCancelledNotificationEvent: CreateMatchCancelledNotificationEventUseCase | null = null,
  ) {}

  async executeSV(_matchId: string, _actorUserId: string): Promise<MatchDetailDTO> {
    const MATCH = await this._matchQueryRepository.getMatchByIdSV(_matchId);
    if (MATCH === null) {
      throw new AppError('PARTIDO_NO_ENCONTRADO', 'El partido indicado no existe.', 404);
    }

    const ORGANIZER_USER_ID =
      await this._matchOrganizerRepository.getOrganizerUserIdByMatchIdSV(_matchId);
    if (ORGANIZER_USER_ID === null) {
      throw new AppError('PARTIDO_NO_ENCONTRADO', 'El partido indicado no existe.', 404);
    }
    if (ORGANIZER_USER_ID !== _actorUserId) {
      throw new AppError('NO_AUTORIZADO', 'No tienes permisos para cancelar este partido.', 403);
    }

    if (MATCH.status !== 'SCHEDULED' && MATCH.status !== 'IN_PROGRESS') {
      throw new AppError(
        'PARTIDO_NO_CANCELABLE',
        'No se puede cancelar el partido en su estado actual.',
        409,
      );
    }

    const CANCELLED = await this._matchCrudRepository.cancelMatchSV(_matchId);

    await this._notifyParticipantsSV({
      matchId: _matchId,
      categoryId: MATCH.categoryId,
      cancelledByUserId: _actorUserId,
    });

    return CANCELLED;
  }

  /**
   * @name    :_notifyParticipantsSV
   * @version :1.0.0
   * @description :Avisa al resto de los participantes que el partido se cancelo.
   * Es best-effort: la cancelacion ya se escribio, asi que un fallo del canal de
   * notificaciones no puede tumbar la operacion.
   * @param {Object} _input - Partido, categoria y quien cancelo
   * @return {Promise<void>}
   */
  private async _notifyParticipantsSV(_input: {
    matchId: string;
    categoryId: string;
    cancelledByUserId: string;
  }): Promise<void> {
    if (
      this._matchParticipationRepository === null ||
      this._createMatchCancelledNotificationEvent === null
    ) {
      return;
    }

    try {
      const PARTICIPANT_IDS = await this._matchParticipationRepository.listParticipantUserIdsSV(
        _input.matchId,
      );
      //? Al que cancela no se le avisa: ya sabe.
      const RECIPIENTS = PARTICIPANT_IDS.filter((_id) => _id !== _input.cancelledByUserId);
      if (RECIPIENTS.length === 0) {
        return;
      }

      await this._createMatchCancelledNotificationEvent.executeSV({
        matchId: _input.matchId,
        categoryId: _input.categoryId,
        userIds: RECIPIENTS,
        payload: {
          kind: 'MATCH_CANCELLED',
          matchId: _input.matchId,
          cancelledByUserId: _input.cancelledByUserId,
        },
      });
    } catch {
      //? Silencio deliberado: ver el JSDoc.
    }
  }
}

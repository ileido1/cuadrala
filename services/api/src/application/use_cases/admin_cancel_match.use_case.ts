import { AppError } from '../../domain/errors/app_error.js';
import type {
  MatchCrudRepository,
  MatchDetailDTO,
} from '../../domain/ports/match_crud_repository.js';
import type { MatchQueryRepository } from '../../domain/ports/match_query_repository.js';

/**
 * Cancelación administrativa de un partido.
 *
 * Se separa de `CancelMatchUseCase` porque la política de autorización es
 * distinta: acá no hay usuario actor —el router valida un secreto de
 * operación— así que no se verifica que quien cancela sea el organizador.
 * La transición de estado sí es la misma.
 */
import type { MatchParticipationRepository } from '../../domain/ports/match_participation_repository.js';
import type { CreateMatchCancelledNotificationEventUseCase } from './create_match_cancelled_notification_event.use_case.js';

export class AdminCancelMatchUseCase {
  constructor(
    private readonly _matchQueryRepository: MatchQueryRepository,
    private readonly _matchCrudRepository: MatchCrudRepository,
    private readonly _matchParticipationRepository: MatchParticipationRepository | null = null,
    private readonly _createMatchCancelledNotificationEvent: CreateMatchCancelledNotificationEventUseCase | null = null,
  ) {}

  /**
   * @name    :executeSV
   * @version :1.0.0
   * @description :Cancela un partido que esté agendado o en curso.
   * @param {string} _matchId - Identificador del partido
   * @return {Promise<MatchDetailDTO>} Partido ya cancelado
   * @throws {AppError} 404 si no existe, 409 si su estado no admite cancelación
   */
  async executeSV(_matchId: string): Promise<MatchDetailDTO> {
    //? 1. El partido tiene que existir.
    const MATCH = await this._matchQueryRepository.getMatchByIdSV(_matchId);
    if (MATCH === null) {
      throw new AppError('PARTIDO_NO_ENCONTRADO', 'El partido indicado no existe.', 404);
    }

    //? 2. Solo se cancela lo que todavía no terminó ni fue cancelado antes.
    if (MATCH.status !== 'SCHEDULED' && MATCH.status !== 'IN_PROGRESS') {
      throw new AppError(
        'PARTIDO_NO_CANCELABLE',
        'No se puede cancelar el partido en su estado actual.',
        409,
      );
    }

    //? 3. Transición de estado.
    const CANCELLED = await this._matchCrudRepository.cancelMatchSV(_matchId);

    //? 4. Avisar. Acá cancela una operación, no una persona: se notifica a todos.
    await this._notifyParticipantsSV(_matchId, MATCH.categoryId);

    return CANCELLED;
  }

  /**
   * @name    :_notifyParticipantsSV
   * @version :1.0.0
   * @description :Avisa a los participantes que el partido se canceló. Es
   * best-effort: la cancelación ya se escribió, así que un fallo del canal de
   * notificaciones no puede tumbar la operación.
   * @param {string} _matchId - Identificador del partido
   * @param {string} _categoryId - Categoría del partido
   * @return {Promise<void>}
   */
  private async _notifyParticipantsSV(_matchId: string, _categoryId: string): Promise<void> {
    if (
      this._matchParticipationRepository === null ||
      this._createMatchCancelledNotificationEvent === null
    ) {
      return;
    }

    try {
      const RECIPIENTS =
        await this._matchParticipationRepository.listParticipantUserIdsSV(_matchId);
      if (RECIPIENTS.length === 0) {
        return;
      }

      await this._createMatchCancelledNotificationEvent.executeSV({
        matchId: _matchId,
        categoryId: _categoryId,
        userIds: RECIPIENTS,
        payload: { kind: 'MATCH_CANCELLED', matchId: _matchId, cancelledByUserId: null },
      });
    } catch {
      //? Silencio deliberado: ver el JSDoc.
    }
  }
}

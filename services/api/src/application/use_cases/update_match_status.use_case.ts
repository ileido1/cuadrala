import type { MatchStatusRepository } from '../../domain/ports/match_status_repository.js';
import type { CreateMatchCancelledNotificationEventUseCase } from './create_match_cancelled_notification_event.use_case.js';
import type { CreateMatchResultReminderNotificationEventUseCase } from './create_match_result_reminder_notification_event.use_case.js';
import { wallClockNowSV } from '../../domain/match_lifecycle/match_block.js';

export interface UpdateMatchStatusUseCaseResult {
  updatedCount: number;
  cancelledCount: number;
  finishedCount: number;
  remindedCount: number;
  notificationFailures: number;
}

/** Avisos que dispara el worker; sin ellos solo cambia estados. */
export type MatchLifecycleNotifiers = {
  matchCancelled: Pick<CreateMatchCancelledNotificationEventUseCase, 'executeSV'>;
  resultReminder: Pick<CreateMatchResultReminderNotificationEventUseCase, 'executeSV'>;
};

/**
 * @name    :UpdateMatchStatusUseCase
 * @version :2.0.0
 * @description :Mueve las partidas según su bloque de cancha: a la hora de inicio
 *               las inicia (completas y pagas) o las cancela avisando por qué; al
 *               vencer el bloque las termina y pide cargar el resultado.
 *               Cada aviso sale una sola vez porque solo se avisa de las partidas
 *               cuyo cambio de estado hizo este llamado (compare-and-swap).
 */
export class UpdateMatchStatusUseCase {
  constructor(
    private readonly _matchStatusRepository: MatchStatusRepository,
    private readonly _notifiers: MatchLifecycleNotifiers | null = null,
  ) {}

  async execute(): Promise<UpdateMatchStatusUseCaseResult> {
    let notificationFailures = 0;

    //? 1. Hora de inicio: iniciar o cancelar
    const START = await this._matchStatusRepository.updateScheduledToInProgressSV();

    //? 2. Avisar a los participantes de cada partida cancelada, con el motivo
    for (const _match of START.cancelled) {
      if (this._notifiers === null || _match.participantUserIds.length === 0) continue;
      try {
        await this._notifiers.matchCancelled.executeSV({
          matchId: _match.matchId,
          categoryId: _match.categoryId,
          userIds: _match.participantUserIds,
          payload: { kind: 'MATCH_CANCELLED', matchId: _match.matchId, cancelledByUserId: null, reason: _match.reason },
        });
      } catch {
        //? Un aviso fallido no frena la reconciliación del resto.
        notificationFailures += 1;
      }
    }

    //? 3. Fin del bloque: terminar las partidas en curso
    const FINISHED = await this._matchStatusRepository.finishExpiredInProgressSV(wallClockNowSV(new Date()));

    //? 4. Pedir el resultado solo donde nadie lo propuso todavía
    let remindedCount = 0;
    for (const _match of FINISHED) {
      if (this._notifiers === null || _match.hasResultDraft || _match.participantUserIds.length === 0) continue;
      try {
        await this._notifiers.resultReminder.executeSV({
          matchId: _match.matchId,
          categoryId: _match.categoryId,
          userIds: _match.participantUserIds,
        });
        remindedCount += 1;
      } catch {
        notificationFailures += 1;
      }
    }

    return {
      updatedCount: START.updatedCount,
      cancelledCount: START.cancelledCount,
      finishedCount: FINISHED.length,
      remindedCount,
      notificationFailures,
    };
  }
}

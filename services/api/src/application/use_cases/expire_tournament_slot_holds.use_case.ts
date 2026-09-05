import type { CreateTournamentNotificationEventUseCase } from './create_tournament_notification_event.use_case.js';

export type ExpiredHoldDTO = {
  reservationId: string;
  tournamentId: string;
  categoryId: string;
  organizerUserId: string | null;
  tournamentName: string;
};

export type TournamentHoldSweepRepository = {
  /** Turnos apartados que ya pasaron su vencimiento. */
  listExpiredHoldsSV(_now: Date, _limit: number): Promise<ExpiredHoldDTO[]>;
  /** Marca esos turnos como vencidos y devuelve cuantos solto de verdad. */
  markExpiredSV(_reservationIds: string[]): Promise<number>;
};

/**
 * Suelta los turnos apartados que nadie confirmo y le avisa al organizador.
 *
 * Sin este barrido, un jugador que no contesta le bloquea a la sede una cancha
 * vendible para siempre: es la contracara obligatoria de apartar.
 *
 * El aviso comparte evento con el rechazo. Para el organizador son el mismo
 * problema —"este partido se quedo sin horario, reubicalo"— y separarlos seria
 * inventar dos notificaciones para una sola necesidad.
 */
export class ExpireTournamentSlotHoldsUseCase {
  constructor(
    private readonly _sweepRepository: TournamentHoldSweepRepository,
    private readonly _createTournamentNotificationEvent: CreateTournamentNotificationEventUseCase | null = null,
  ) {}

  async executeSV(_input?: {
    now?: Date;
    limit?: number;
  }): Promise<{ expiredHolds: number; notifiedTournaments: number }> {
    const NOW = _input?.now ?? new Date();
    const EXPIRED = await this._sweepRepository.listExpiredHoldsSV(NOW, _input?.limit ?? 500);

    if (EXPIRED.length === 0) {
      return { expiredHolds: 0, notifiedTournaments: 0 };
    }

    const RELEASED = await this._sweepRepository.markExpiredSV(
      EXPIRED.map((_h) => _h.reservationId),
    );

    if (this._createTournamentNotificationEvent === null) {
      return { expiredHolds: RELEASED, notifiedTournaments: 0 };
    }

    //? Un aviso por torneo, no uno por partido: si vencieron ocho turnos del
    //? mismo cuadro, el organizador tiene un problema, no ocho notificaciones.
    const BY_TOURNAMENT = new Map<string, ExpiredHoldDTO[]>();
    for (const HOLD of EXPIRED) {
      const LIST = BY_TOURNAMENT.get(HOLD.tournamentId) ?? [];
      LIST.push(HOLD);
      BY_TOURNAMENT.set(HOLD.tournamentId, LIST);
    }

    let notified = 0;
    for (const [TOURNAMENT_ID, HOLDS] of BY_TOURNAMENT) {
      const FIRST = HOLDS[0];
      if (FIRST === undefined || FIRST.organizerUserId === null) continue;

      try {
        await this._createTournamentNotificationEvent.executeSV({
          type: 'TOURNAMENT_MATCH_NEEDS_ATTENTION',
          tournamentId: TOURNAMENT_ID,
          categoryId: FIRST.categoryId,
          payload: {
            tournamentName: FIRST.tournamentName,
            releasedSlots: HOLDS.length,
            reason: 'HOLD_EXPIRED',
          },
          userIds: [FIRST.organizerUserId],
        });
        notified += 1;
      } catch {
        // Un aviso que falla no puede dejar la cancha bloqueada: ya se solto.
      }
    }

    return { expiredHolds: RELEASED, notifiedTournaments: notified };
  }
}

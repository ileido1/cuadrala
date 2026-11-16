import { matchBlockEndsAtSV, type MatchAutoCancelReason } from '../../domain/match_lifecycle/match_block.js';
import type {
  AutoCancelledMatchDTO,
  AutoFinishedMatchDTO,
  MatchStatusRepository,
} from '../../domain/ports/match_status_repository.js';
import { PRISMA } from '../prisma_client.js';

/** Ids de los participantes con usuario (los invitados de torneo no reciben avisos). */
function participantUserIdsSV(_participants: Array<{ userId: string | null }>): string[] {
  return _participants
    .map((_participant) => _participant.userId)
    .filter((_userId): _userId is string => _userId !== null);
}

export class PrismaMatchStatusRepository implements MatchStatusRepository {
  async updateScheduledToInProgressSV(): Promise<{
    updatedCount: number;
    cancelledCount: number;
    cancelled: AutoCancelledMatchDTO[];
  }> {
    const NOW = new Date();

    //? 1. Partidas programadas cuya hora de bloque ya llegó
    const EXPIRED = await PRISMA.match.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledAt: { lte: NOW },
      },
      select: {
        id: true,
        categoryId: true,
        tournamentId: true,
        maxParticipants: true,
        pricePerPlayerCents: true,
        participants: { select: { userId: true } },
        transactions: { select: { userId: true, status: true } },
      },
    });

    const CANCEL_CANDIDATES: Array<{
      matchId: string;
      categoryId: string;
      reason: MatchAutoCancelReason;
      participantUserIds: string[];
    }> = [];
    const START_IDS: string[] = [];

    for (const MATCH of EXPIRED) {
      // Los partidos de torneo siguen el calendario/roster del torneo y no
      // usan la regla de cupo/pago de las partidas abiertas.
      if (MATCH.tournamentId !== null) {
        START_IDS.push(MATCH.id);
        continue;
      }

      const IS_FULL = MATCH.participants.length >= MATCH.maxParticipants;
      const IS_PAID =
        MATCH.pricePerPlayerCents === 0 ||
        MATCH.participants.every(
          (_participant) =>
            _participant.userId !== null &&
            MATCH.transactions.some(
              (_transaction) =>
                _transaction.userId === _participant.userId && _transaction.status === 'CONFIRMED',
            ),
        );

      if (IS_FULL && IS_PAID) {
        START_IDS.push(MATCH.id);
        continue;
      }

      //? Incompleta pesa más que impaga: con cupo libre no hay pago que valga.
      CANCEL_CANDIDATES.push({
        matchId: MATCH.id,
        categoryId: MATCH.categoryId,
        reason: IS_FULL ? 'UNPAID' : 'INCOMPLETE',
        participantUserIds: participantUserIdsSV(MATCH.participants),
      });
    }

    //? 2. Cancelar una por una con compare-and-swap: solo quien cambia el estado
    //?    la devuelve, así dos ticks concurrentes no avisan dos veces.
    const CANCELLED: AutoCancelledMatchDTO[] = [];
    for (const CANDIDATE of CANCEL_CANDIDATES) {
      const WON = await PRISMA.$transaction(async (_tx) => {
        const UPDATED = await _tx.match.updateMany({
          where: { id: CANDIDATE.matchId, status: 'SCHEDULED' },
          data: { status: 'CANCELLED' },
        });
        if (UPDATED.count === 0) return false;
        await _tx.reservation.updateMany({
          where: { matchId: CANDIDATE.matchId, matchStatus: 'SCHEDULED' },
          data: { matchStatus: 'CANCELLED' },
        });
        return true;
      });
      if (WON) CANCELLED.push(CANDIDATE);
    }

    //? 3. Iniciar las listas
    const STARTED = await PRISMA.match.updateMany({
      where: { id: { in: START_IDS }, status: 'SCHEDULED' },
      data: { status: 'IN_PROGRESS' },
    });

    //? 4. Actualizar también la reserva asociada si existe (las de partidas
    //?    canceladas ya quedaron en CANCELLED en el paso 2)
    await PRISMA.reservation.updateMany({
      where: {
        matchStatus: 'SCHEDULED',
        scheduledAt: { lte: NOW },
      },
      data: {
        matchStatus: 'IN_PROGRESS',
      },
    });

    return { updatedCount: STARTED.count, cancelledCount: CANCELLED.length, cancelled: CANCELLED };
  }

  async finishExpiredInProgressSV(_now: Date): Promise<AutoFinishedMatchDTO[]> {
    //? 1. Partidas regulares en curso que ya empezaron (sin hora no hay bloque)
    const IN_PROGRESS = await PRISMA.match.findMany({
      where: {
        status: 'IN_PROGRESS',
        tournamentId: null,
        scheduledAt: { not: null, lte: _now },
      },
      select: {
        id: true,
        categoryId: true,
        scheduledAt: true,
        reservation: { select: { durationMinutes: true } },
        participants: { select: { userId: true } },
        _count: { select: { resultDrafts: true } },
      },
    });

    //? 2. Terminar solo las que vencieron su bloque, con compare-and-swap por partida
    const FINISHED: AutoFinishedMatchDTO[] = [];
    for (const MATCH of IN_PROGRESS) {
      if (MATCH.scheduledAt === null) continue;
      const ENDS_AT = matchBlockEndsAtSV(MATCH.scheduledAt, MATCH.reservation?.durationMinutes ?? null);
      if (_now.getTime() < ENDS_AT.getTime()) continue;

      const WON = await PRISMA.$transaction(async (_tx) => {
        const UPDATED = await _tx.match.updateMany({
          where: { id: MATCH.id, status: 'IN_PROGRESS' },
          data: { status: 'FINISHED' },
        });
        if (UPDATED.count === 0) return false;
        await _tx.reservation.updateMany({
          where: { matchId: MATCH.id, matchStatus: { in: ['SCHEDULED', 'IN_PROGRESS'] } },
          data: { matchStatus: 'FINISHED' },
        });
        return true;
      });

      if (WON) {
        FINISHED.push({
          matchId: MATCH.id,
          categoryId: MATCH.categoryId,
          participantUserIds: participantUserIdsSV(MATCH.participants),
          hasResultDraft: MATCH._count.resultDrafts > 0,
        });
      }
    }

    return FINISHED;
  }

  async transitionStatusIfCurrentSV(_params: {
    matchId: string;
    fromStatus: string;
    toStatus: string;
  }): Promise<boolean> {
    //? Compare-and-swap: solo actualiza si el estado actual coincide con fromStatus
    const RESULT = await PRISMA.match.updateMany({
      where: { id: _params.matchId, status: _params.fromStatus as never },
      data: { status: _params.toStatus as never },
    });

    return RESULT.count > 0;
  }
}

import type { MatchStatusRepository } from '../../domain/ports/match_status_repository.js';
import { PRISMA } from '../prisma_client.js';

export class PrismaMatchStatusRepository implements MatchStatusRepository {
  async updateScheduledToInProgressSV(): Promise<{ updatedCount: number; cancelledCount: number }> {
    const NOW = new Date();

    const EXPIRED = await PRISMA.match.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledAt: { lte: NOW },
      },
      select: {
        id: true,
        tournamentId: true,
        maxParticipants: true,
        pricePerPlayerCents: true,
        participants: { select: { userId: true } },
        transactions: { select: { userId: true, status: true } },
      },
    });

    const CANCEL_IDS: string[] = [];
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

      if (IS_FULL && IS_PAID) START_IDS.push(MATCH.id);
      else CANCEL_IDS.push(MATCH.id);
    }

    const [CANCELLED, STARTED] = await PRISMA.$transaction([
      PRISMA.match.updateMany({
        where: { id: { in: CANCEL_IDS }, status: 'SCHEDULED' },
        data: { status: 'CANCELLED' },
      }),
      PRISMA.match.updateMany({
        where: { id: { in: START_IDS }, status: 'SCHEDULED' },
        data: { status: 'IN_PROGRESS' },
      }),
    ]);

    //? 2. Actualizar también la reserva asociada si existe
    await PRISMA.reservation.updateMany({
      where: {
        matchStatus: 'SCHEDULED',
        scheduledAt: { lte: NOW },
      },
      data: {
        matchStatus: 'IN_PROGRESS',
      },
    });

    return { updatedCount: STARTED.count, cancelledCount: CANCELLED.count };
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

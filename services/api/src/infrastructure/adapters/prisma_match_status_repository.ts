import type { MatchStatusRepository } from '../../domain/ports/match_status_repository.js';
import { PRISMA } from '../prisma_client.js';

export class PrismaMatchStatusRepository implements MatchStatusRepository {
  async updateScheduledToInProgressSV(): Promise<{ updatedCount: number }> {
    //? 1. Buscar partidas SCHEDULED cuyo scheduledAt sea <= ahora
    const NOW = new Date();

    const UPDATED = await PRISMA.match.updateMany({
      where: {
        status: 'SCHEDULED',
        scheduledAt: { lte: NOW },
      },
      data: {
        status: 'IN_PROGRESS',
      },
    });

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

    return { updatedCount: UPDATED.count };
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

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
}

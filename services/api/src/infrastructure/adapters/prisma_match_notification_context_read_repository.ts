import type {
  MatchNotificationContextDTO,
  MatchNotificationContextReadRepository,
} from '../../domain/ports/match_notification_context_read_repository.js';

import { PRISMA } from '../prisma_client.js';

export class PrismaMatchNotificationContextReadRepository
  implements MatchNotificationContextReadRepository
{
  async getByMatchIdSV(_matchId: string): Promise<MatchNotificationContextDTO | null> {
    const ROW = await PRISMA.match.findUnique({
      where: { id: _matchId },
      select: {
        id: true,
        status: true,
        categoryId: true,
        maxParticipants: true,
        court: {
          select: {
            venue: { select: { latitude: true, longitude: true } },
          },
        },
      },
    });

    if (ROW === null) {
      return null;
    }

    return {
      matchId: ROW.id,
      status: ROW.status,
      categoryId: ROW.categoryId,
      maxParticipants: ROW.maxParticipants,
      venueLat: ROW.court?.venue.latitude ?? null,
      venueLng: ROW.court?.venue.longitude ?? null,
    };
  }
}


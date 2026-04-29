import type { MatchOrganizerRepository } from '../../domain/ports/match_organizer_repository.js';
import { PRISMA } from '../prisma_client.js';

export class PrismaMatchOrganizerRepository implements MatchOrganizerRepository {
  async getOrganizerUserIdByMatchIdSV(_matchId: string): Promise<string | null> {
    const ROW = await PRISMA.match.findUnique({
      where: { id: _matchId },
      select: { organizerUserId: true },
    });
    return ROW?.organizerUserId ?? null;
  }
}


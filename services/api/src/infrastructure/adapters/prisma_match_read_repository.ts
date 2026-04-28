import type { MatchReadRepository } from '../../domain/ports/match_read_repository.js';

import { PRISMA } from '../prisma_client.js';

export class PrismaMatchReadRepository implements MatchReadRepository {
  async findByIdSV(_matchId: string) {
    return PRISMA.match.findUnique({
      where: { id: _matchId },
      select: {
        id: true,
        categoryId: true,
        sportId: true,
        status: true,
        maxParticipants: true,
      },
    });
  }
}


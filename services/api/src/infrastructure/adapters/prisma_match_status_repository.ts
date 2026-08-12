import type {
  MatchStatusRepository,
  MatchStatusTransitionInputDTO,
} from '../../domain/ports/match_status_repository.js';
import type { MatchStatus } from '../../generated/prisma/client.js';

import { PRISMA } from '../prisma_client.js';

export class PrismaMatchStatusRepository implements MatchStatusRepository {
  async transitionStatusIfCurrentSV(_input: MatchStatusTransitionInputDTO): Promise<boolean> {
    const RESULT = await PRISMA.match.updateMany({
      where: { id: _input.matchId, status: _input.fromStatus as MatchStatus },
      data: { status: _input.toStatus as MatchStatus },
    });

    return RESULT.count > 0;
  }
}


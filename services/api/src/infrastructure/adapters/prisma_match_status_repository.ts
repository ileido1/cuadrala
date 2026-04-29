import type {
  MatchStatusRepository,
  MatchStatusTransitionInputDTO,
} from '../../domain/ports/match_status_repository.js';

import { PRISMA } from '../prisma_client.js';

export class PrismaMatchStatusRepository implements MatchStatusRepository {
  async transitionStatusIfCurrentSV(_input: MatchStatusTransitionInputDTO): Promise<boolean> {
    const RESULT = await PRISMA.match.updateMany({
      where: { id: _input.matchId, status: _input.fromStatus },
      data: { status: _input.toStatus },
    });

    return RESULT.count > 0;
  }
}


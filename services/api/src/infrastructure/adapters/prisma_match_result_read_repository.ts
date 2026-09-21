import type {
  MatchResultReadRepository,
  MatchResultWithMatchDTO,
} from '../../domain/ports/match_result_read_repository.js';

import { PRISMA } from '../prisma_client.js';

export class PrismaMatchResultReadRepository implements MatchResultReadRepository {
  async findByIdWithMatchSV(_resultId: string): Promise<MatchResultWithMatchDTO | null> {
    const RESULT = await PRISMA.matchResult.findUnique({
      where: { id: _resultId },
      select: {
        id: true,
        matchId: true,
        match: { select: { categoryId: true, affectsElo: true } },
        scores: { where: { userId: { not: null } }, select: { userId: true, points: true } },
      },
    });

    if (RESULT === null) return null;

    return {
      resultId: RESULT.id,
      matchId: RESULT.matchId,
      categoryId: RESULT.match.categoryId,
      affectsElo: RESULT.match.affectsElo,
      scores: RESULT.scores.filter((_score): _score is { userId: string; points: number } => _score.userId !== null),
    };
  }
}

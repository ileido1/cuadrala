import type { TournamentMatchResultRepository } from '../../domain/ports/tournament_match_result_repository.js';
import { PRISMA } from '../prisma_client.js';

export class PrismaTournamentMatchResultRepository implements TournamentMatchResultRepository {
  async getVenueIdForTournamentSV(_tournamentId: string): Promise<string | null> {
    const MATCH = await PRISMA.match.findFirst({
      where: { tournamentId: _tournamentId },
      select: { court: { select: { venueId: true } } },
    });
    return MATCH?.court?.venueId ?? null;
  }

  async matchBelongsToTournamentSV(
    _matchId: string,
    _tournamentId: string,
  ): Promise<boolean> {
    const MATCH = await PRISMA.match.findFirst({
      where: { id: _matchId, tournamentId: _tournamentId },
      select: { id: true },
    });
    return MATCH !== null;
  }

  async registerResultSV(_input: {
    matchId: string;
    scores: Array<{ userId: string; points: number }>;
  }): Promise<{ resultId: string; recordedAt: Date }> {
    const RESULT = await PRISMA.$transaction(async (_tx) => {
      const CREATED_RESULT = await _tx.matchResult.create({
        data: { matchId: _input.matchId },
      });

      await _tx.matchResultScore.createMany({
        data: _input.scores.map((_s) => ({
          resultId: CREATED_RESULT.id,
          userId: _s.userId,
          points: _s.points,
        })),
      });

      await _tx.match.update({
        where: { id: _input.matchId },
        data: { status: 'FINISHED' },
      });

      return CREATED_RESULT;
    });

    return { resultId: RESULT.id, recordedAt: RESULT.recordedAt };
  }
}

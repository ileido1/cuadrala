import type {
  TournamentScoreboardRepository,
  TournamentScoreboardRow,
} from '../../domain/ports/tournament_scoreboard_repository.js';

import { PRISMA } from '../prisma_client.js';

export class PrismaTournamentScoreboardRepository implements TournamentScoreboardRepository {
  async listScoreboardByTournamentIdSV(_tournamentId: string): Promise<TournamentScoreboardRow[]> {
    const RESULTS = await PRISMA.matchResult.findMany({
      where: {
        match: {
          tournamentId: _tournamentId,
        },
      },
      include: {
        scores: {
          include: {
            user: { select: { name: true } },
          },
        },
      },
    });

    const BY_USER = new Map<string, { points: number; matchIds: Set<string>; name: string }>();

    for (const _r of RESULTS) {
      for (const _s of _r.scores) {
        const CUR = BY_USER.get(_s.userId) ?? {
          points: 0,
          matchIds: new Set<string>(),
          name: _s.user.name,
        };
        CUR.points += _s.points;
        CUR.matchIds.add(_r.matchId);
        BY_USER.set(_s.userId, CUR);
      }
    }

    return [...BY_USER.entries()].map(([_userId, _v]) => ({
      userId: _userId,
      name: _v.name,
      points: _v.points,
      gamesPlayed: _v.matchIds.size,
    }));
  }
}


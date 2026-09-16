import { resolveMatchWinningUserIdsSV } from '../../domain/tournament/match_side_aggregation.js';
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
          where: { userId: { not: null } },
          include: {
            user: { select: { name: true } },
          },
        },
      },
    });

    //? `MatchResultScore` no tiene columna de lado (una fila por usuario): el
    //? lado de cada participante vive en `MatchParticipant.teamLabel`, unido
    //? por matchId. Sin esto, un ganador por duplas se calcularía comparando
    //? filas individuales en vez de sumas por lado (ver
    //? `domain/tournament/match_side_aggregation.ts`).
    const MATCH_IDS = RESULTS.map((_r) => _r.matchId);
    const PARTICIPANTS = await PRISMA.matchParticipant.findMany({
      where: { matchId: { in: MATCH_IDS } },
      select: { matchId: true, userId: true, tournamentRegistrationId: true, teamLabel: true },
    });
    const TEAM_LABEL_BY_MATCH = new Map<string, Map<string, string | null>>();
    for (const _p of PARTICIPANTS) {
      const BY_USER_ID = TEAM_LABEL_BY_MATCH.get(_p.matchId) ?? new Map<string, string | null>();
      if (_p.userId !== null) BY_USER_ID.set(_p.userId, _p.teamLabel);
      if (_p.tournamentRegistrationId !== null) BY_USER_ID.set(_p.tournamentRegistrationId, _p.teamLabel);
      TEAM_LABEL_BY_MATCH.set(_p.matchId, BY_USER_ID);
    }

    const BY_USER = new Map<
      string,
      { points: number; matchIds: Set<string>; name: string; gamesWon: number }
    >();

    for (const _r of RESULTS) {
      const TEAM_LABEL_BY_USER_ID = TEAM_LABEL_BY_MATCH.get(_r.matchId) ?? new Map();
      const AUTH_SCORES = _r.scores.filter((_s) => _s.userId !== null && _s.user !== null);
      const WINNING_USER_IDS = resolveMatchWinningUserIdsSV(
        AUTH_SCORES.map((_s) => ({
          userId: _s.userId!,
          teamLabel: TEAM_LABEL_BY_USER_ID.get(_s.userId) ?? null,
          points: _s.points,
        })),
      );

      for (const _s of AUTH_SCORES) {
        const CUR = BY_USER.get(_s.userId!) ?? {
          points: 0,
          matchIds: new Set<string>(),
          name: _s.user!.name,
          gamesWon: 0,
        };
        CUR.points += _s.points;
        CUR.matchIds.add(_r.matchId);
        if (WINNING_USER_IDS.includes(_s.userId!)) CUR.gamesWon += 1;
        BY_USER.set(_s.userId!, CUR);
      }
    }

    return [...BY_USER.entries()].map(([_userId, _v]) => ({
      userId: _userId,
      name: _v.name,
      points: _v.points,
      gamesPlayed: _v.matchIds.size,
      gamesWon: _v.gamesWon,
    }));
  }
}

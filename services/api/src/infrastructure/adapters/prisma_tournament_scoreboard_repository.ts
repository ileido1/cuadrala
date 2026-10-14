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
          include: {
            user: { select: { name: true } },
            tournamentRegistration: { select: { guestName: true } },
          },
        },
      },
    });
    const REGISTRATIONS = await PRISMA.tournamentRegistration.findMany({
      where: {
        tournamentId: _tournamentId,
        status: 'CONFIRMED',
      },
      select: {
        id: true,
        userId: true,
        guestName: true,
        user: { select: { name: true } },
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
      {
        points: number;
        matchIds: Set<string>;
        name: string;
        gamesWon: number;
        gamesDrawn: number;
        pointsFor: number;
        pointsAgainst: number;
        headToHeadWins: Record<string, number>;
      }
    >();
    const REGISTRATION_ID_BY_USER_ID = new Map(
      REGISTRATIONS.flatMap((_registration) =>
        _registration.userId
          ? [[_registration.userId, _registration.id] as const]
          : [],
      ),
    );
    const PARTICIPANT_KEY = (_score: {
      userId: string | null;
      tournamentRegistrationId: string | null;
    }) =>
      _score.tournamentRegistrationId ??
      (_score.userId !== null
        ? (REGISTRATION_ID_BY_USER_ID.get(_score.userId) ?? _score.userId)
        : null);

    // La tabla también debe existir antes del primer resultado. Los invitados
    // se identifican por registrationId hasta que reclamen su inscripción.
    for (const _registration of REGISTRATIONS) {
      BY_USER.set(_registration.id, {
        points: 0,
        matchIds: new Set<string>(),
        name:
          _registration.user?.name ?? _registration.guestName ?? 'Invitado',
        gamesWon: 0,
        gamesDrawn: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        headToHeadWins: {},
      });
    }

    for (const _r of RESULTS) {
      const TEAM_LABEL_BY_USER_ID = TEAM_LABEL_BY_MATCH.get(_r.matchId) ?? new Map();
      const SCORES = _r.scores.filter(
        (_s) => _s.userId !== null || _s.tournamentRegistrationId !== null,
      );
      const SIDE_SCORES = SCORES.map((_s) => ({
          userId: PARTICIPANT_KEY(_s)!,
          teamLabel: TEAM_LABEL_BY_USER_ID.get(PARTICIPANT_KEY(_s)!) ?? null,
          points: _s.points,
        }));
      const WINNING_USER_IDS = resolveMatchWinningUserIdsSV(SIDE_SCORES);
      const SIDE_TOTALS = new Map<string, number>();
      for (const _score of SIDE_SCORES) {
        const SIDE_KEY = _score.teamLabel ?? _score.userId;
        SIDE_TOTALS.set(SIDE_KEY, (SIDE_TOTALS.get(SIDE_KEY) ?? 0) + _score.points);
      }
      const HAS_DRAW = SIDE_TOTALS.size > 1 && WINNING_USER_IDS.length === 0;

      for (const _s of SCORES) {
        const PARTICIPANT_ID = PARTICIPANT_KEY(_s)!;
        const CUR = BY_USER.get(PARTICIPANT_ID) ?? {
          points: 0,
          matchIds: new Set<string>(),
          name: _s.user?.name ?? _s.tournamentRegistration?.guestName ?? 'Invitado',
          gamesWon: 0,
          gamesDrawn: 0,
          pointsFor: 0,
          pointsAgainst: 0,
          headToHeadWins: {},
        };
        CUR.points += _s.points;
        CUR.matchIds.add(_r.matchId);
        const SIDE_KEY = TEAM_LABEL_BY_USER_ID.get(PARTICIPANT_ID) ?? PARTICIPANT_ID;
        CUR.pointsFor += SIDE_TOTALS.get(SIDE_KEY) ?? _s.points;
        CUR.pointsAgainst += [...SIDE_TOTALS.entries()]
          .filter(([_sideKey]) => _sideKey !== SIDE_KEY)
          .reduce((TOTAL, [, _points]) => TOTAL + _points, 0);
        if (HAS_DRAW) CUR.gamesDrawn += 1;
        if (WINNING_USER_IDS.includes(PARTICIPANT_ID)) {
          CUR.gamesWon += 1;
          for (const _opponent of SIDE_SCORES) {
            const OPPONENT_SIDE = _opponent.teamLabel ?? _opponent.userId;
            if (OPPONENT_SIDE === SIDE_KEY) continue;
            CUR.headToHeadWins[_opponent.userId] =
              (CUR.headToHeadWins[_opponent.userId] ?? 0) + 1;
          }
        }
        BY_USER.set(PARTICIPANT_ID, CUR);
      }
    }

    return [...BY_USER.entries()].map(([_participantKey, _v]) => {
      const MATCH_SCORE = RESULTS.flatMap((_r) => _r.scores).find(
        (_s) => PARTICIPANT_KEY(_s) === _participantKey,
      );
      const REGISTRATION_ID = REGISTRATIONS.some(
        (_r) => _r.id === _participantKey,
      )
        ? _participantKey
        : MATCH_SCORE?.tournamentRegistrationId ?? undefined;
      return {
        userId:
          MATCH_SCORE?.userId ??
          REGISTRATIONS.find((_r) => _r.id === _participantKey)?.userId ??
          null,
        ...(typeof REGISTRATION_ID === 'string'
          ? { tournamentRegistrationId: REGISTRATION_ID }
          : {}),
        name: _v.name,
        points: _v.points,
        gamesPlayed: _v.matchIds.size,
        gamesWon: _v.gamesWon,
        gamesLost: Math.max(0, _v.matchIds.size - _v.gamesWon - _v.gamesDrawn),
        gamesDrawn: _v.gamesDrawn,
        pointsFor: _v.pointsFor,
        pointsAgainst: _v.pointsAgainst,
        difference: _v.pointsFor - _v.pointsAgainst,
        headToHeadWins: _v.headToHeadWins,
      };
    });
  }
}

import type {
  TournamentMatchResultRepository,
  TournamentMatchStateSV,
} from '../../domain/ports/tournament_match_result_repository.js';
import { AppError } from '../../domain/errors/app_error.js';
import { groupMatchParticipantsBySideSV } from '../../domain/tournament/match_side_aggregation.js';
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

  async matchHasResultSV(_matchId: string): Promise<boolean> {
    const EXISTING = await PRISMA.matchResult.findFirst({
      where: { matchId: _matchId },
      select: { id: true },
    });
    return EXISTING !== null;
  }

  async registerResultSV(_input: {
    matchId: string;
    scores: Array<{ userId: string; points: number }>;
  }): Promise<{ resultId: string; recordedAt: Date }> {
    const RESULT = await PRISMA.$transaction(async (_tx) => {
      await _tx.$executeRaw`SELECT id FROM "Match" WHERE id = ${_input.matchId} FOR UPDATE`;

      const EXISTING = await _tx.matchResult.findFirst({
        where: { matchId: _input.matchId },
        select: { id: true },
      });
      if (EXISTING !== null) {
        throw new AppError('RESULTADO_YA_CARGADO', 'Este partido ya tiene un resultado cargado.', 409);
      }

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

  async listTournamentMatchStatesSV(_input: {
    tournamentId: string;
    scheduleKey: string;
  }): Promise<TournamentMatchStateSV[]> {
    //? Una sola consulta trae Match + participantes + resultado (con sus
    //? scores) de todo el calendario: nunca N+1 por slot del cuadro.
    const MATCHES = await PRISMA.match.findMany({
      where: {
        tournamentId: _input.tournamentId,
        formatParameters: { path: ['scheduleKey'], equals: _input.scheduleKey },
      },
      select: {
        id: true,
        status: true,
        formatParameters: true,
        participants: {
          select: { userId: true, teamLabel: true, tournamentRegistrationId: true },
        },
        results: {
          take: 1,
          select: { scores: { select: { userId: true, points: true } } },
        },
      },
    });

    return MATCHES.map((_match) => {
      const PARAMS = _match.formatParameters as {
        roundNumber: number;
        matchNumber: number;
      };

      return {
        roundNumber: PARAMS.roundNumber,
        matchNumber: PARAMS.matchNumber,
        matchId: _match.id,
        matchStatus: _match.status,
        sides: groupMatchParticipantsBySideSV(
          _match.participants.map((_p) => ({
            userId: _p.userId,
            teamLabel: _p.teamLabel,
            tournamentRegistrationId: _p.tournamentRegistrationId ?? _p.userId ?? '',
          })),
        ),
        scores: (_match.results[0]?.scores ?? []).map((_s) => ({
          userId: _s.userId,
          points: _s.points,
        })),
      };
    });
  }
}

import type {
  MatchMaterializationPlanDTO,
  TournamentMatchMaterializationRepository,
} from '../../domain/ports/tournament_match_materialization_repository.js';
import { PRISMA } from '../prisma_client.js';

export class PrismaTournamentMatchMaterializationRepository
  implements TournamentMatchMaterializationRepository
{
  async transitionAndMaterializeSV(_input: {
    tournamentId: string;
    toStatus: string;
    scheduleKey: string;
    sportId: string;
    categoryId: string;
    organizerUserId: string;
    matchType: 'AMERICANO' | 'REGULAR';
    matches: MatchMaterializationPlanDTO[];
  }): Promise<{
    created: boolean;
    matchCount: number;
    tournament: { id: string; name: string; status: string };
  }> {
    return PRISMA.$transaction(async (_tx) => {
      //? 1. Idempotencia: si ya existen partidos materializados con este scheduleKey, no duplicar
      const EXISTING_COUNT = await _tx.match.count({
        where: {
          tournamentId: _input.tournamentId,
          formatParameters: { path: ['scheduleKey'], equals: _input.scheduleKey },
        },
      });

      //? 2. La transición de estado siempre se aplica, incluso si la materialización es un no-op
      const UPDATED_TOURNAMENT = await _tx.tournament.update({
        where: { id: _input.tournamentId },
        data: { status: _input.toStatus as never },
        select: { id: true, name: true, status: true },
      });

      if (EXISTING_COUNT > 0) {
        return { created: false, matchCount: EXISTING_COUNT, tournament: UPDATED_TOURNAMENT };
      }

      //? 3. Crear un Match + sus MatchParticipant por cada plan, dentro de la misma transacción
      for (const PLAN of _input.matches) {
        await _tx.match.create({
          data: {
            sportId: _input.sportId,
            categoryId: _input.categoryId,
            organizerUserId: _input.organizerUserId,
            tournamentId: _input.tournamentId,
            type: _input.matchType as never,
            status: 'SCHEDULED',
            maxParticipants: PLAN.participants.length,
            ...(PLAN.scheduledAt !== null ? { scheduledAt: PLAN.scheduledAt } : {}),
            ...(PLAN.courtId !== null ? { courtId: PLAN.courtId } : {}),
            formatParameters: {
              scheduleKey: _input.scheduleKey,
              roundNumber: PLAN.roundNumber,
              matchNumber: PLAN.matchNumber,
            } as never,
            participants: {
              create: PLAN.participants.map((_p) => ({
                userId: _p.userId,
                ...(_p.teamLabel !== null ? { teamLabel: _p.teamLabel } : {}),
              })),
            },
          },
        });
      }

      return { created: true, matchCount: _input.matches.length, tournament: UPDATED_TOURNAMENT };
    });
  }
}

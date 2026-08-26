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

      //? Si ya existen matches (no-op), retorna sin cambiar estado
      if (EXISTING_COUNT > 0) {
        const TOURNAMENT = await _tx.tournament.findUniqueOrThrow({
          where: { id: _input.tournamentId },
          select: { id: true, name: true, status: true },
        });
        return { created: false, matchCount: EXISTING_COUNT, tournament: TOURNAMENT };
      }

      //? 2. Solo actualiza estado si va a crear nuevos matches
      const UPDATED_TOURNAMENT = await _tx.tournament.update({
        where: { id: _input.tournamentId },
        data: { status: _input.toStatus as never },
        select: { id: true, name: true, status: true },
      });

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
                //? Slice 1 (tournament-guest-registration): userId es nulo para participantes GUEST;
                //? tournamentRegistrationId siempre identifica la inscripción de origen.
                ...(_p.userId !== null ? { userId: _p.userId } : {}),
                tournamentRegistrationId: _p.tournamentRegistrationId,
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

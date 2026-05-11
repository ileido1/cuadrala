import { AppError } from '../../domain/errors/app_error.js';
import type { TournamentQueryRepository } from '../../domain/ports/tournament_query_repository.js';
import type { VenueStaffRepository } from '../../domain/ports/venue_staff_repository.js';
import type { MatchCrudRepository } from '../../domain/ports/match_crud_repository.js';
import { PRISMA } from '../../infrastructure/prisma_client.js';

export type ScoreEntryDTO = {
  scores: { userId: string; points: number }[];
};

export type RegisterTournamentMatchResultInput = {
  tournamentId: string;
  matchId: string;
  matchNumber: number;
  roundNumber: number;
  scores: { userId: string; points: number }[];
};

export type RegisterTournamentMatchResultOutput = {
  resultId: string;
  recordedAt: Date;
};

export class RegisterTournamentMatchResultUseCase {
  constructor(
    private readonly _tournamentQueryRepository: TournamentQueryRepository,
    private readonly _venueStaffRepository: VenueStaffRepository,
    private readonly _matchCrudRepository: MatchCrudRepository,
  ) {}

  async executeSV(
    _input: RegisterTournamentMatchResultInput & { requestingUserId: string },
  ): Promise<RegisterTournamentMatchResultOutput> {
    const { tournamentId, matchId, matchNumber, roundNumber, scores, requestingUserId } = _input;

    // 1. Obtener torneo
    const TOURNAMENT = await this._tournamentQueryRepository.getTournamentByIdSV(tournamentId);
    if (TOURNAMENT === null) {
      throw new AppError('TORNEO_NO_ENCONTRADO', 'El torneo indicado no existe.', 404);
    }

    // 2. Autorización: el usuario debe ser staff del venue del torneo
    // Para eso necesitamos obtener el venue a través de los matches del torneo
    // Dado que Tournament no tiene relación directa con Venue, usamos Court->Venue
    const MATCHES_WITH_COURT = await PRISMA.match.findMany({
      where: { tournamentId },
      select: { courtId: true, court: { select: { venueId: true } } },
      take: 1,
    });

    if (MATCHES_WITH_COURT.length === 0) {
      throw new AppError('VALIDACION_FALLIDA', 'El torneo no tiene partidos asociados.', 400);
    }

    const VENUE_ID = MATCHES_WITH_COURT[0]!.court?.venueId;
    if (VENUE_ID === undefined) {
      throw new AppError('VALIDACION_FALLIDA', 'No se pudo determinar la sede del torneo.', 400);
    }

    const IS_STAFF = await this._venueStaffRepository.isUserStaffOfVenueSV(requestingUserId, VENUE_ID);
    if (!IS_STAFF) {
      throw new AppError('ACCESO_DENEGADO', 'No tienes permisos para editar este torneo.', 403);
    }

    // 3. Validar que el match pertenezca al torneo y tenga el formato correcto
    const MATCH = await PRISMA.match.findFirst({
      where: {
        id: matchId,
        tournamentId,
        // round y matchNumber no están en el schema actual, pero podríamos buscarlos
      },
    });

    if (MATCH === null) {
      throw new AppError('VALIDACION_FALLIDA', 'El partido no pertenece a este torneo.', 400);
    }

    // 4. Validar scores
    if (!Array.isArray(scores) || scores.length === 0) {
      throw new AppError('VALIDACION_FALLIDA', 'Debe proporcionar al menos un resultado.', 400);
    }

    for (const SCORE of scores) {
      if (!SCORE.userId || typeof SCORE.points !== 'number' || SCORE.points < 0) {
        throw new AppError('VALIDACION_FALLIDA', 'Cada score debe tener userId y points (número no negativo).', 400);
      }
    }

    // 5. Determinar ganador (el que tenga más puntos)
    const SORTED = [...scores].sort((a, b) => b.points - a.points);
    const WINNER_ID = SORTED[0]!.userId;

    // 6. Crear MatchResult y MatchResultScore en transacción
    const RESULT = await PRISMA.$transaction(async (_tx) => {
      const CREATED_RESULT = await _tx.matchResult.create({
        data: {
          matchId,
        },
      });

      await _tx.matchResultScore.createMany({
        data: scores.map((_s) => ({
          resultId: CREATED_RESULT.id,
          userId: _s.userId,
          points: _s.points,
        })),
      });

      await _tx.match.update({
        where: { id: matchId },
        data: { status: 'FINISHED' },
      });

      return CREATED_RESULT;
    });

    return {
      resultId: RESULT.id,
      recordedAt: RESULT.recordedAt,
    };
  }
}

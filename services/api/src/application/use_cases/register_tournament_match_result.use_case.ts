import { AppError } from '../../domain/errors/app_error.js';
import type { TournamentQueryRepository } from '../../domain/ports/tournament_query_repository.js';
import type { TournamentMatchResultRepository } from '../../domain/ports/tournament_match_result_repository.js';
import type { AssertTournamentOrganizerAccessUseCase } from './assert_tournament_organizer_access.use_case.js';

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
    private readonly _assertTournamentOrganizerAccess: AssertTournamentOrganizerAccessUseCase,
    private readonly _tournamentMatchResultRepository: TournamentMatchResultRepository,
  ) {}

  async executeSV(
    _input: RegisterTournamentMatchResultInput & { requestingUserId: string },
  ): Promise<RegisterTournamentMatchResultOutput> {
    const { tournamentId, matchId, scores, requestingUserId } = _input;

    const TOURNAMENT = await this._tournamentQueryRepository.getTournamentByIdSV(tournamentId);
    if (TOURNAMENT === null) {
      throw new AppError('TORNEO_NO_ENCONTRADO', 'El torneo indicado no existe.', 404);
    }

    const VENUE_ID =
      await this._tournamentMatchResultRepository.getVenueIdForTournamentSV(tournamentId);
    if (VENUE_ID === null) {
      throw new AppError('VALIDACION_FALLIDA', 'El torneo no tiene partidos asociados.', 400);
    }

    //? El organizador del torneo también puede cargar resultados, no solo el staff de la sede
    //? (regla compartida con list_tournament_registrations.use_case.ts — no duplicarla).
    await this._assertTournamentOrganizerAccess.executeSV({
      actorUserId: requestingUserId,
      organizerUserId: TOURNAMENT.organizerUserId,
      venueId: VENUE_ID,
      forbiddenMessage: 'No tienes permisos para editar este torneo.',
    });

    const BELONGS = await this._tournamentMatchResultRepository.matchBelongsToTournamentSV(
      matchId,
      tournamentId,
    );
    if (!BELONGS) {
      throw new AppError('VALIDACION_FALLIDA', 'El partido no pertenece a este torneo.', 400);
    }

    if (!Array.isArray(scores) || scores.length === 0) {
      throw new AppError('VALIDACION_FALLIDA', 'Debe proporcionar al menos un resultado.', 400);
    }

    for (const SCORE of scores) {
      if (!SCORE.userId || typeof SCORE.points !== 'number' || SCORE.points < 0) {
        throw new AppError(
          'VALIDACION_FALLIDA',
          'Cada score debe tener userId y points (número no negativo).',
          400,
        );
      }
    }

    return this._tournamentMatchResultRepository.registerResultSV({ matchId, scores });
  }
}

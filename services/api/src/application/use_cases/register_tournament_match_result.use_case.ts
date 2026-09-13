import { AppError } from '../../domain/errors/app_error.js';
import type { TournamentQueryRepository } from '../../domain/ports/tournament_query_repository.js';
import type { TournamentMatchResultRepository } from '../../domain/ports/tournament_match_result_repository.js';
import type { AssertTournamentOrganizerAccessUseCase } from './assert_tournament_organizer_access.use_case.js';
import {
  resolveMatchWinningUserIdsSV,
  type MatchParticipantScoreSV,
} from '../../domain/tournament/match_side_aggregation.js';

//? Único formato donde un empate es inválido (D13): el bracket necesita un
//? ganador para avanzar. Round robin/americano aceptan empates sin avance.
const SINGLE_ELIMINATION_FORMAT_CODE = 'SINGLE_ELIMINATION';

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
  /** Partidos de ronda siguiente creados por el avance automático (S7c-1); vacío fuera de SE. */
  createdMatchIds: string[];
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

    //? Un partido ya resuelto no admite un segundo resultado (evita duplicar el marcador).
    //? Chequeo a nivel de aplicación, no atómico bajo concurrencia real: la garantía
    //? transaccional (SELECT ... FOR UPDATE) queda para S7c-1, que ya construye
    //? registerResultAndAdvanceSV como una única transacción.
    const HAS_RESULT = await this._tournamentMatchResultRepository.matchHasResultSV(matchId);
    if (HAS_RESULT) {
      throw new AppError(
        'RESULTADO_YA_CARGADO',
        'Este partido ya tiene un resultado cargado.',
        409,
      );
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

    //? Empate inválido solo en eliminación simple (D13). El agrupamiento por
    //? lado (teamLabel ?? userId) reutiliza resolveMatchWinningUserIdsSV — nunca
    //? se reimplementa la comparación de filas individuales (pattern #807).
    if (TOURNAMENT.formatPresetName === SINGLE_ELIMINATION_FORMAT_CODE) {
      const PARTICIPANT_SIDES =
        await this._tournamentMatchResultRepository.listMatchParticipantSidesSV(matchId);
      const TEAM_LABEL_BY_USER_ID = new Map(
        PARTICIPANT_SIDES.map((_p) => [_p.userId, _p.teamLabel]),
      );

      const SIDE_SCORES: MatchParticipantScoreSV[] = scores.map((_score) => ({
        userId: _score.userId,
        teamLabel: TEAM_LABEL_BY_USER_ID.get(_score.userId) ?? null,
        points: _score.points,
      }));

      const WINNING_USER_IDS = resolveMatchWinningUserIdsSV(SIDE_SCORES);
      if (WINNING_USER_IDS.length === 0) {
        throw new AppError(
          'VALIDACION_FALLIDA',
          'Un partido de eliminación simple no puede terminar empatado.',
          400,
        );
      }
    }

    //? La escritura del resultado y el avance automático de eliminación simple
    //? (S7c-1, D13) ocurren en una única transacción del repositorio — nunca
    //? se separan, para que un resultado nunca quede guardado sin su avance
    //? (o viceversa) si falla a mitad de camino.
    return this._tournamentMatchResultRepository.registerResultAndAdvanceSV({ matchId, scores });
  }
}

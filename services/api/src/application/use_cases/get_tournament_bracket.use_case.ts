import { AppError } from '../../domain/errors/app_error.js';
import { generateSingleEliminationScheduleSV } from '../../domain/single_elimination/bracket_generator.js';
import type { TournamentQueryRepository } from '../../domain/ports/tournament_query_repository.js';
import type { MatchCrudRepository } from '../../domain/ports/match_crud_repository.js';

export type PlayerBracketSlotDTO = {
  userId: string;
  displayName: string;
  seedPosition: number;
} | null;

export type BracketMatchDTO = {
  matchNumber: number;
  roundNumber: number;
  playerA: PlayerBracketSlotDTO;
  playerB: PlayerBracketSlotDTO;
  winnerId: string | null;
  score: { userId: string; points: number }[] | null;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BYE';
  matchId: string | null;
};

export type BracketRoundDTO = {
  roundNumber: number;
  name: string;
  matches: BracketMatchDTO[];
};

export type TournamentBracketDTO = {
  tournamentId: string;
  tournamentName: string;
  totalRounds: number;
  bracketSize: number;
  rounds: BracketRoundDTO[];
};

export class GetTournamentBracketUseCase {
  constructor(
    private readonly _tournamentQueryRepository: TournamentQueryRepository,
    private readonly _matchCrudRepository: MatchCrudRepository,
  ) {}

  async executeSV(_input: { tournamentId: string }): Promise<TournamentBracketDTO> {
    const TOURNAMENT = await this._tournamentQueryRepository.getTournamentByIdSV(_input.tournamentId);
    if (TOURNAMENT === null) {
      throw new AppError('TORNEO_NO_ENCONTRADO', 'El torneo indicado no existe.', 404);
    }

    // Validar que el formato sea SINGLE_ELIMINATION
    if (TOURNAMENT.formatPresetName !== 'SINGLE_ELIMINATION') {
      throw new AppError(
        'FORMATO_NO_SOPORTADO',
        'Bracket disponible solo para torneos SINGLE_ELIMINATION.',
        400,
      );
    }

    const REGISTRATIONS = await this._tournamentQueryRepository.listTournamentRegistrationsSV(
      _input.tournamentId,
    );

    const CONFIRMED = REGISTRATIONS.filter((r) => r.status === 'CONFIRMED');
    if (CONFIRMED.length < 2) {
      throw new AppError(
        'VALIDACION_FALLIDA',
        'Se requieren al menos 2 participantes confirmados para SINGLE_ELIMINATION.',
        400,
      );
    }

    // Ordenar por createdAt para tener orden determinista (seed por posición)
    const SORTED_CONFIRMED = [...CONFIRMED].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const PARTICIPANT_IDS = SORTED_CONFIRMED.map((r) => r.userId);

    // Generar bracket usando la función del dominio
    const SCHEDULE = generateSingleEliminationScheduleSV({ participantUserIds: PARTICIPANT_IDS });

    // Construir DTO con mapeo de jugadores
    const ROUNDS: BracketRoundDTO[] = SCHEDULE.rounds.map((_round) => ({
      roundNumber: _round.roundNumber,
      name: _round.name,
      matches: _round.matches.map((_match) => {
        const PLAYER_A_SLOT: PlayerBracketSlotDTO =
          _match.playerA !== null
            ? {
                userId: _match.playerA,
                displayName:
                  SORTED_CONFIRMED.find((r) => r.userId === _match.playerA)?.userName ?? 'Jugador desconocido',
                seedPosition: _match.seedPositionA ?? 0,
              }
            : null;

        const PLAYER_B_SLOT: PlayerBracketSlotDTO =
          _match.playerB !== null
            ? {
                userId: _match.playerB,
                displayName:
                  SORTED_CONFIRMED.find((r) => r.userId === _match.playerB)?.userName ?? 'Jugador desconocido',
                seedPosition: _match.seedPositionB ?? 0,
              }
            : null;

        return {
          matchNumber: _match.matchNumber,
          roundNumber: _round.roundNumber,
          playerA: PLAYER_A_SLOT,
          playerB: PLAYER_B_SLOT,
          winnerId: null,
          score: null,
          status: _match.bye ? 'BYE' : 'PENDING',
          matchId: null,
        };
      }),
    }));

    return {
      tournamentId: TOURNAMENT.id,
      tournamentName: TOURNAMENT.name,
      totalRounds: SCHEDULE.totalRounds,
      bracketSize: SCHEDULE.bracketSize,
      rounds: ROUNDS,
    };
  }
}

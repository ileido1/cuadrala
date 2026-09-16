import { AppError } from '../../domain/errors/app_error.js';
import { generateSingleEliminationScheduleSV } from '../../domain/single_elimination/bracket_generator.js';
import { resolveMatchWinningUserIdsSV } from '../../domain/tournament/match_side_aggregation.js';
import type { TournamentQueryRepository } from '../../domain/ports/tournament_query_repository.js';
import type { MatchCrudRepository } from '../../domain/ports/match_crud_repository.js';
import type { TournamentScheduleRepository } from '../../domain/ports/tournament_schedule_repository.js';
import type {
  TournamentMatchResultRepository,
  TournamentMatchStateSV,
} from '../../domain/ports/tournament_match_result_repository.js';

export type PlayerBracketSlotDTO = {
  registrationId: string;
  userId: string | null;
  displayName: string;
  seedPosition: number;
} | null;

export type BracketMatchDTO = {
  matchNumber: number;
  roundNumber: number;
  playerA: PlayerBracketSlotDTO;
  playerB: PlayerBracketSlotDTO;
  winnerId: string | null;
  score: { userId: string | null; tournamentRegistrationId: string | null; points: number }[] | null;
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

//? Match.status (dominio: SCHEDULED/IN_PROGRESS/FINISHED/CANCELLED) al status
//? del bracket. Un partido materializado sin resultado (SCHEDULED) o
//? cancelado se muestra como PENDING — el bracket no distingue "cancelado"
//? de "todavía no jugado", ninguna pantalla lo necesita hoy.
function mapMatchStatusToBracketStatusSV(
  _matchStatus: string,
): 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' {
  if (_matchStatus === 'FINISHED') return 'COMPLETED';
  if (_matchStatus === 'IN_PROGRESS') return 'IN_PROGRESS';
  return 'PENDING';
}

/**
 * Resuelve el `winnerId` real de un partido materializado con resultado.
 * Reutiliza `resolveMatchWinningUserIdsSV` (misma regla de suma-por-lado que
 * S7b/S7c) armando el `teamLabel` de cada score a partir de `sides` — en
 * singles cada `sideKey` ya es el propio `userId`, así que la agrupación
 * sigue siendo correcta sin una rama aparte.
 */
function resolveBracketWinnerIdSV(_state: TournamentMatchStateSV): string | null {
  if (_state.scores.length === 0) return null;

  const SIDE_KEY_BY_REF = new Map<string, string>();
  for (const SIDE of _state.sides) {
    for (const USER_ID of SIDE.userIds) if (USER_ID !== null) SIDE_KEY_BY_REF.set(USER_ID, SIDE.sideKey);
    for (const REGISTRATION_ID of SIDE.registrationIds ?? []) SIDE_KEY_BY_REF.set(REGISTRATION_ID, SIDE.sideKey);
  }

  const WINNING_USER_IDS = resolveMatchWinningUserIdsSV(
    _state.scores.map((_s) => ({
      userId: _s.tournamentRegistrationId ?? _s.userId ?? '',
      teamLabel: SIDE_KEY_BY_REF.get(_s.tournamentRegistrationId ?? _s.userId ?? '') ?? null,
      points: _s.points,
    })),
  );
  return WINNING_USER_IDS[0] ?? null;
}

export class GetTournamentBracketUseCase {
  constructor(
    private readonly _tournamentQueryRepository: TournamentQueryRepository,
    private readonly _matchCrudRepository: MatchCrudRepository,
    private readonly _tournamentScheduleRepository: TournamentScheduleRepository,
    private readonly _tournamentMatchResultRepository: TournamentMatchResultRepository,
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
    //? El cuadro usa el id de inscripción para incluir jugadores autenticados
    //? e invitados. El userId sigue viajando aparte para resultados y estado.
    const PARTICIPANT_IDS = SORTED_CONFIRMED.map((r) => r.id);
    const REGISTRATION_BY_ID = new Map(SORTED_CONFIRMED.map((r) => [r.id, r]));

    // Generar bracket usando la función del dominio
    const SCHEDULE = generateSingleEliminationScheduleSV({ participantRegistrationIds: PARTICIPANT_IDS });

    //? Estado real (S8b): mientras no exista un calendario guardado el bracket
    //? es pura preview (siempre fue así). Una vez generado, cada slot que ya
    //? tenga un Match materializado se pisa con su estado real — los slots sin
    //? Match (incluidos los byes, que nunca materializan uno) quedan en preview.
    const STORED_SCHEDULE = await this._tournamentScheduleRepository.findByTournamentIdSV(
      _input.tournamentId,
    );
    const MATCH_STATE_BY_SLOT = new Map<string, TournamentMatchStateSV>();
    if (STORED_SCHEDULE !== null) {
      const MATCH_STATES = await this._tournamentMatchResultRepository.listTournamentMatchStatesSV({
        tournamentId: _input.tournamentId,
        scheduleKey: STORED_SCHEDULE.scheduleKey,
      });
      for (const STATE of MATCH_STATES) {
        MATCH_STATE_BY_SLOT.set(`${STATE.roundNumber}:${STATE.matchNumber}`, STATE);
      }
    }

    // Construir DTO con mapeo de jugadores
    const ROUNDS: BracketRoundDTO[] = SCHEDULE.rounds.map((_round) => ({
      roundNumber: _round.roundNumber,
      name: _round.name,
      matches: _round.matches.map((_match) => {
        const PLAYER_A_REGISTRATION =
          _match.playerA === null ? null : REGISTRATION_BY_ID.get(_match.playerA);
        const PLAYER_B_REGISTRATION =
          _match.playerB === null ? null : REGISTRATION_BY_ID.get(_match.playerB);
        const PLAYER_A_SLOT: PlayerBracketSlotDTO = PLAYER_A_REGISTRATION === undefined || PLAYER_A_REGISTRATION === null
          ? null
          : {
              registrationId: PLAYER_A_REGISTRATION.id,
              userId: PLAYER_A_REGISTRATION.userId,
              displayName: PLAYER_A_REGISTRATION.userName ?? PLAYER_A_REGISTRATION.guestName ?? 'Jugador desconocido',
              seedPosition: _match.seedPositionA ?? 0,
            };
        const PLAYER_B_SLOT: PlayerBracketSlotDTO = PLAYER_B_REGISTRATION === undefined || PLAYER_B_REGISTRATION === null
          ? null
          : {
              registrationId: PLAYER_B_REGISTRATION.id,
              userId: PLAYER_B_REGISTRATION.userId,
              displayName: PLAYER_B_REGISTRATION.userName ?? PLAYER_B_REGISTRATION.guestName ?? 'Jugador desconocido',
              seedPosition: _match.seedPositionB ?? 0,
            };

        const REAL_STATE = MATCH_STATE_BY_SLOT.get(`${_round.roundNumber}:${_match.matchNumber}`);

        return {
          matchNumber: _match.matchNumber,
          roundNumber: _round.roundNumber,
          playerA: PLAYER_A_SLOT,
          playerB: PLAYER_B_SLOT,
          winnerId: REAL_STATE !== undefined ? resolveBracketWinnerIdSV(REAL_STATE) : null,
          score: REAL_STATE !== undefined && REAL_STATE.scores.length > 0 ? REAL_STATE.scores : null,
          status:
            REAL_STATE !== undefined
              ? mapMatchStatusToBracketStatusSV(REAL_STATE.matchStatus)
              : _match.bye
                ? 'BYE'
                : 'PENDING',
          matchId: REAL_STATE?.matchId ?? null,
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

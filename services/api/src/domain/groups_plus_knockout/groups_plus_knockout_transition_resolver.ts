import type {
  TournamentMatchStateSV,
} from '../ports/tournament_match_result_repository.js';
import type {
  GroupsPlusKnockoutScheduleDTO,
  GroupsPlusKnockoutRoundDTO,
} from './groups_plus_knockout_schedule_generator.js';

export type GroupsPlusKnockoutStandingDTO = {
  registrationId: string;
  points: number;
  wins: number;
};

export type GroupsPlusKnockoutTransitionResultDTO = {
  canAdvance: boolean;
  payload: GroupsPlusKnockoutScheduleDTO;
  standings: Record<number, GroupsPlusKnockoutStandingDTO[]>;
};

function matchKeySV(_roundNumber: number, _matchNumber: number): string {
  return `${_roundNumber}|${_matchNumber}`;
}

function clonePayloadSV(_payload: GroupsPlusKnockoutScheduleDTO): GroupsPlusKnockoutScheduleDTO {
  return structuredClone(_payload);
}

function groupRoundsSV(_payload: GroupsPlusKnockoutScheduleDTO): GroupsPlusKnockoutRoundDTO[] {
  return _payload.rounds.filter((_round) => _round.stage === 'GROUP');
}

function findStateSV(
  _states: Map<string, TournamentMatchStateSV>,
  _roundNumber: number,
  _matchNumber: number,
): TournamentMatchStateSV | undefined {
  return _states.get(matchKeySV(_roundNumber, _matchNumber));
}

/**
 * Resuelve la transición de grupos a semifinales sin depender de Prisma ni de
 * HTTP. En v1 los puntos son la suma de los scores del competidor y las
 * victorias son los partidos en los que su score fue estrictamente mayor.
 *
 * El desempate final por `registrationId` es deliberadamente determinista:
 * puntos y victorias iguales no bloquean la transición.
 */
export function resolveGroupsPlusKnockoutTransitionSV(_input: {
  payload: GroupsPlusKnockoutScheduleDTO;
  matchStates: TournamentMatchStateSV[];
}): GroupsPlusKnockoutTransitionResultDTO {
  const PAYLOAD = clonePayloadSV(_input.payload);
  const STATES = new Map(
    _input.matchStates.map((_state) => [
      matchKeySV(_state.roundNumber, _state.matchNumber),
      _state,
    ]),
  );
  const STANDINGS = new Map<number, Map<string, GroupsPlusKnockoutStandingDTO>>();
  for (const GROUP of PAYLOAD.groups) {
    STANDINGS.set(
      GROUP.groupNumber,
      new Map(
        GROUP.participantRegistrationIds.map((_registrationId) => [
          _registrationId,
          { registrationId: _registrationId, points: 0, wins: 0 },
        ]),
      ),
    );
  }

  let CAN_ADVANCE = true;
  for (const ROUND of groupRoundsSV(PAYLOAD)) {
    const GROUP_STANDINGS = STANDINGS.get(ROUND.groupNumber!);
    if (GROUP_STANDINGS === undefined) {
      CAN_ADVANCE = false;
      continue;
    }

    for (const MATCH of ROUND.matches) {
      const STATE = findStateSV(STATES, ROUND.roundNumber, MATCH.matchNumber);
      if (STATE === undefined || STATE.matchStatus !== 'FINISHED' || STATE.scores.length === 0) {
        CAN_ADVANCE = false;
        continue;
      }

      const SIDE_TOTALS = STATE.sides.map((_side) => {
        const SIDE_REFS = new Set([
          ..._side.registrationIds,
          ..._side.userIds.filter((_id): _id is string => _id !== null),
        ]);
        const SIDE_SCORES = STATE.scores
          .filter((_score) => {
            const REF = _score.tournamentRegistrationId ?? _score.userId;
            return REF !== null && REF !== undefined && SIDE_REFS.has(REF);
          })
        const TOTAL = SIDE_SCORES.reduce((_sum, _score) => _sum + _score.points, 0);
        return {
          registrationId: _side.registrationIds[0],
          total: TOTAL,
          hasScore: SIDE_SCORES.length > 0,
        };
      });

      if (
        SIDE_TOTALS.length < 2 ||
        SIDE_TOTALS.some((_side) => _side.registrationId === undefined || !_side.hasScore)
      ) {
        CAN_ADVANCE = false;
        continue;
      }

      const [SIDE_A, SIDE_B] = SIDE_TOTALS as [
        { registrationId: string; total: number; hasScore: boolean },
        { registrationId: string; total: number; hasScore: boolean },
      ];
      const ENTRY_A = GROUP_STANDINGS.get(SIDE_A.registrationId);
      const ENTRY_B = GROUP_STANDINGS.get(SIDE_B.registrationId);
      if (ENTRY_A === undefined || ENTRY_B === undefined) {
        CAN_ADVANCE = false;
        continue;
      }

      ENTRY_A.points += SIDE_A.total;
      ENTRY_B.points += SIDE_B.total;
      if (SIDE_A.total > SIDE_B.total) ENTRY_A.wins += 1;
      if (SIDE_B.total > SIDE_A.total) ENTRY_B.wins += 1;
    }
  }

  const SORTED_STANDINGS = new Map<number, GroupsPlusKnockoutStandingDTO[]>();
  for (const [GROUP_NUMBER, GROUP_STANDINGS] of STANDINGS) {
    SORTED_STANDINGS.set(
      GROUP_NUMBER,
      [...GROUP_STANDINGS.values()].sort(
        (_a, _b) =>
          _b.points - _a.points ||
          _b.wins - _a.wins ||
          (_a.registrationId < _b.registrationId ? -1 : _a.registrationId > _b.registrationId ? 1 : 0),
      ),
    );
  }

  if (CAN_ADVANCE) {
    const SEMIFINAL_ROUND = PAYLOAD.rounds.find(
      (_round) => _round.roundNumber === PAYLOAD.knockout.semifinalRoundNumber,
    );
    const GROUP_ONE = SORTED_STANDINGS.get(1) ?? [];
    const GROUP_TWO = SORTED_STANDINGS.get(2) ?? [];
    if (SEMIFINAL_ROUND === undefined || GROUP_ONE.length < 2 || GROUP_TWO.length < 2) {
      CAN_ADVANCE = false;
    } else {
      const SEMIFINAL_ONE = SEMIFINAL_ROUND.matches.find((_match) => _match.matchNumber === 1);
      const SEMIFINAL_TWO = SEMIFINAL_ROUND.matches.find((_match) => _match.matchNumber === 2);
      if (SEMIFINAL_ONE === undefined || SEMIFINAL_TWO === undefined) {
        CAN_ADVANCE = false;
      } else {
        SEMIFINAL_ONE.playerA = GROUP_ONE[0]!.registrationId;
        SEMIFINAL_ONE.playerB = GROUP_TWO[1]!.registrationId;
        SEMIFINAL_TWO.playerA = GROUP_TWO[0]!.registrationId;
        SEMIFINAL_TWO.playerB = GROUP_ONE[1]!.registrationId;
      }
    }
  }

  return {
    canAdvance: CAN_ADVANCE,
    payload: PAYLOAD,
    standings: Object.fromEntries(SORTED_STANDINGS),
  };
}

export function isGroupsPlusKnockoutResolvedSV(_payload: GroupsPlusKnockoutScheduleDTO): boolean {
  const SEMIFINAL_ROUND = _payload.rounds.find(
    (_round) => _round.roundNumber === _payload.knockout.semifinalRoundNumber,
  );
  return (
    SEMIFINAL_ROUND?.matches.every((_match) => _match.playerA !== null && _match.playerB !== null) ??
    false
  );
}

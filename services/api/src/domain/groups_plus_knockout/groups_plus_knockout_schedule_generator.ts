import { generateRoundRobinScheduleSV } from '../round_robin/round_robin_schedule_generator.js';

export const GROUPS_PLUS_KNOCKOUT_DEFAULT_PARAMETERS = {
  groupCount: 2,
  qualifiersPerGroup: 2,
} as const;

type QualificationSlotDTO = {
  groupNumber: number;
  position: number;
};

export type GroupsPlusKnockoutScheduleInputDTO = {
  participantRegistrationIds: string[];
  groupCount?: number;
  qualifiersPerGroup?: number;
};

export type GroupsPlusKnockoutMatchDTO = {
  matchNumber: number;
  playerA: string | null;
  playerB: string | null;
  bye: false;
  playerASource?: QualificationSlotDTO;
  playerBSource?: QualificationSlotDTO;
};

export type GroupsPlusKnockoutRoundDTO = {
  roundNumber: number;
  name: string;
  stage: 'GROUP' | 'KNOCKOUT';
  groupNumber?: number;
  matches: GroupsPlusKnockoutMatchDTO[];
};

export type GroupsPlusKnockoutGroupDTO = {
  groupNumber: number;
  participantRegistrationIds: string[];
};

export type GroupsPlusKnockoutScheduleDTO = {
  groups: GroupsPlusKnockoutGroupDTO[];
  rounds: GroupsPlusKnockoutRoundDTO[];
  knockout: {
    qualifiedParticipantCount: number;
    semifinalRoundNumber: number;
    finalRoundNumber: number;
  };
};

function normalizeParticipantIdsSV(_ids: string[]): string[] {
  const UNIQUE = Array.from(new Set(_ids));
  UNIQUE.sort();
  return UNIQUE;
}

function assertParticipantRulesSV(_input: GroupsPlusKnockoutScheduleInputDTO): {
  groupCount: number;
  qualifiersPerGroup: number;
} {
  if (!Array.isArray(_input.participantRegistrationIds)) {
    throw new Error('participantRegistrationIds debe ser una lista.');
  }

  const GROUP_COUNT = _input.groupCount ?? GROUPS_PLUS_KNOCKOUT_DEFAULT_PARAMETERS.groupCount;
  const QUALIFIERS_PER_GROUP =
    _input.qualifiersPerGroup ?? GROUPS_PLUS_KNOCKOUT_DEFAULT_PARAMETERS.qualifiersPerGroup;

  if (GROUP_COUNT !== 2 || QUALIFIERS_PER_GROUP !== 2) {
    throw new Error('GROUPS_PLUS_KNOCKOUT requiere 2 grupos y 2 clasificados por grupo en v1.');
  }
  if (_input.participantRegistrationIds.length < GROUP_COUNT * QUALIFIERS_PER_GROUP) {
    throw new Error('Se requieren al menos 4 participantes para GROUPS_PLUS_KNOCKOUT.');
  }

  const UNIQUE = new Set(_input.participantRegistrationIds);
  if (UNIQUE.size !== _input.participantRegistrationIds.length) {
    throw new Error('participantRegistrationIds no permite IDs duplicados.');
  }

  return { groupCount: GROUP_COUNT, qualifiersPerGroup: QUALIFIERS_PER_GROUP };
}

/**
 * Genera la clave determinista para idempotencia.
 */
export function createGroupsPlusKnockoutScheduleKeySV(
  _input: GroupsPlusKnockoutScheduleInputDTO,
): string {
  const PARAMETERS = assertParticipantRulesSV(_input);
  const IDS = normalizeParticipantIdsSV(_input.participantRegistrationIds);
  return `groups_plus_knockout:v1:${IDS.join(',')}:${PARAMETERS.groupCount}x${PARAMETERS.qualifiersPerGroup}`;
}

/**
 * Genera la primera versión del formato grupos + knockout.
 *
 * Los participantes se ordenan por registrationId y se reparten en round-robin
 * entre los dos grupos. Las semifinales quedan con slots de clasificación
 * explícitos, pero sin inventar jugadores ni standings.
 */
export function generateGroupsPlusKnockoutScheduleSV(
  _input: GroupsPlusKnockoutScheduleInputDTO,
): GroupsPlusKnockoutScheduleDTO {
  const PARAMETERS = assertParticipantRulesSV(_input);
  const IDS = normalizeParticipantIdsSV(_input.participantRegistrationIds);
  const GROUPS: GroupsPlusKnockoutGroupDTO[] = Array.from(
    { length: PARAMETERS.groupCount },
    (_unused, _index) => ({ groupNumber: _index + 1, participantRegistrationIds: [] }),
  );

  // Distribución estable y balanceada: 1, 3, 5... van al grupo 1; 2, 4, 6...
  // van al grupo 2. No usa standings ni el orden de llegada de la inscripción.
  IDS.forEach((_id, _index) => {
    GROUPS[_index % PARAMETERS.groupCount]!.participantRegistrationIds.push(_id);
  });

  const ROUNDS: GroupsPlusKnockoutRoundDTO[] = [];
  let NEXT_ROUND_NUMBER = 1;

  for (const GROUP of GROUPS) {
    const GROUP_SCHEDULE = generateRoundRobinScheduleSV({
      participantRegistrationIds: GROUP.participantRegistrationIds,
    });

    for (const ROUND of GROUP_SCHEDULE.rounds) {
      ROUNDS.push({
        roundNumber: NEXT_ROUND_NUMBER,
        name: `Grupo ${GROUP.groupNumber} · Ronda ${ROUND.roundNumber}`,
        stage: 'GROUP',
        groupNumber: GROUP.groupNumber,
        matches: ROUND.matches.map((_match) => ({
          matchNumber: _match.matchNumber,
          playerA: _match.playerA,
          playerB: _match.playerB,
          bye: false,
        })),
      });
      NEXT_ROUND_NUMBER += 1;
    }
  }

  const SEMIFINAL_ROUND_NUMBER = NEXT_ROUND_NUMBER;
  const FINAL_ROUND_NUMBER = SEMIFINAL_ROUND_NUMBER + 1;

  ROUNDS.push({
    roundNumber: SEMIFINAL_ROUND_NUMBER,
    name: 'Semifinales',
    stage: 'KNOCKOUT',
    matches: [
      {
        matchNumber: 1,
        playerA: null,
        playerB: null,
        bye: false,
        playerASource: { groupNumber: 1, position: 1 },
        playerBSource: { groupNumber: 2, position: 2 },
      },
      {
        matchNumber: 2,
        playerA: null,
        playerB: null,
        bye: false,
        playerASource: { groupNumber: 2, position: 1 },
        playerBSource: { groupNumber: 1, position: 2 },
      },
    ],
  });
  ROUNDS.push({
    roundNumber: FINAL_ROUND_NUMBER,
    name: 'Final',
    stage: 'KNOCKOUT',
    matches: [
      {
        matchNumber: 1,
        playerA: null,
        playerB: null,
        bye: false,
      },
    ],
  });

  return {
    groups: GROUPS,
    rounds: ROUNDS,
    knockout: {
      qualifiedParticipantCount: PARAMETERS.groupCount * PARAMETERS.qualifiersPerGroup,
      semifinalRoundNumber: SEMIFINAL_ROUND_NUMBER,
      finalRoundNumber: FINAL_ROUND_NUMBER,
    },
  };
}

export type SingleEliminationScheduleInputDTO = {
  participantUserIds: string[];
  thirdPlaceMatch?: boolean;
};

export type SingleEliminationMatchDTO = {
  matchNumber: number;
  playerA: string | null;
  playerB: string | null;
  bye: boolean;
  seedPositionA?: number;
  seedPositionB?: number;
};

export type SingleEliminationRoundDTO = {
  roundNumber: number;
  name: string;
  matches: SingleEliminationMatchDTO[];
};

export type SingleEliminationScheduleDTO = {
  rounds: SingleEliminationRoundDTO[];
  totalRounds: number;
  bracketSize: number;
};

/**
 * Normaliza y ordena participantes para garantizar determinismo.
 */
function normalizeParticipantIdsSV(_ids: string[]): string[] {
  const UNIQUE = Array.from(new Set(_ids));
  UNIQUE.sort();
  return UNIQUE;
}

/**
 * Valida reglas de participantes para SINGLE_ELIMINATION.
 * Mínimo 2 participantes; sin duplicados.
 */
function assertParticipantRulesSV(_ids: string[]): void {
  if (!Array.isArray(_ids)) {
    throw new Error('participantUserIds debe ser una lista.');
  }
  if (_ids.length < 2) {
    throw new Error('Se requieren al menos 2 participantes para SINGLE_ELIMINATION.');
  }
  const UNIQUE = new Set(_ids);
  if (UNIQUE.size !== _ids.length) {
    throw new Error('participantUserIds no permite IDs duplicados.');
  }
}

/**
 * Calcula la siguiente potencia de 2 >= n.
 */
function nextPowerOfTwoSV(_n: number): number {
  let p = 1;
  while (p < _n) {
    p *= 2;
  }
  return p;
}

/**
 * Nombres estándar de rondas según tamaño del bracket.
 */
function roundNameSV(_roundNumber: number, _totalRounds: number): string {
  const REMAINING = _totalRounds - _roundNumber + 1;
  if (REMAINING === 1) return 'Final';
  if (REMAINING === 2) return 'Semifinal';
  if (REMAINING === 3) return 'Cuartos de final';
  return `Ronda ${_roundNumber}`;
}

/**
 * Genera la clave determinista para idempotencia.
 */
export function createSingleEliminationScheduleKeySV(_input: SingleEliminationScheduleInputDTO): string {
  assertParticipantRulesSV(_input.participantUserIds);
  const IDS = normalizeParticipantIdsSV(_input.participantUserIds);
  const TP = _input.thirdPlaceMatch ? ':tp' : '';
  return `single_elimination:v1:${IDS.join(',')}${TP}`;
}

/**
 * Genera bracket de eliminación simple determinista.
 *
 * Algoritmo (standard seeding):
 * 1. Calcular bracketSize = siguiente potencia de 2 >= N
 * 2. Calcular byes = bracketSize - N
 * 3. Distribuir byes según seeding estándar (top seeds reciben byes)
 * 4. Generar rondas desde la primera hasta la final
 * 5. Opcionalmente agregar partido por el 3er puesto
 *
 * Reglas MVP:
 * - Participantes únicos, mínimo 2
 * - Orden estable basado en IDs normalizados (seed por posición)
 * - Byes se distribuyen para que los mejores seeds descansen en primera ronda
 */
export function generateSingleEliminationScheduleSV(
  _input: SingleEliminationScheduleInputDTO,
): SingleEliminationScheduleDTO {
  assertParticipantRulesSV(_input.participantUserIds);

  const IDS = normalizeParticipantIdsSV(_input.participantUserIds);
  const N = IDS.length;
  const BRACKET_SIZE = nextPowerOfTwoSV(N);
  const BYES = BRACKET_SIZE - N;
  const TOTAL_ROUNDS = Math.log2(BRACKET_SIZE);

  // Distribuir byes: los seeds más altos (primeros en el array ordenado) reciben bye
  // Posiciones con bye en la primera ronda
  const seededPositions: (string | null)[] = new Array(BRACKET_SIZE).fill(null);

  // Colocar participantes en posiciones de seed (standard bracket seeding)
  // Para un bracket de 8: seeds 1,8,4,5,2,7,3,6
  const positions = generateStandardSeedingPositionsSV(BRACKET_SIZE);

  let byeCount = 0;
  for (let i = 0; i < BRACKET_SIZE; i++) {
    const SEED_POS = positions[i]!;
    if (i < N) {
      seededPositions[SEED_POS] = IDS[i]!;
    } else {
      seededPositions[SEED_POS] = '__BYE__';
      byeCount++;
    }
  }

  const rounds: SingleEliminationRoundDTO[] = [];

  // Generar primera ronda (con byes)
  const firstRoundMatches: SingleEliminationMatchDTO[] = [];
  for (let m = 0; m < BRACKET_SIZE / 2; m++) {
    const PLAYER_A = seededPositions[m * 2]!;
    const PLAYER_B = seededPositions[m * 2 + 1]!;
    const IS_BYE = PLAYER_A === '__BYE__' || PLAYER_B === '__BYE__';

    firstRoundMatches.push({
      matchNumber: m + 1,
      playerA: PLAYER_A === '__BYE__' ? null : PLAYER_A,
      playerB: PLAYER_B === '__BYE__' ? null : PLAYER_B,
      bye: IS_BYE,
      seedPositionA: positions[m * 2]! + 1,
      seedPositionB: positions[m * 2 + 1]! + 1,
    });
  }

  rounds.push({
    roundNumber: 1,
    name: roundNameSV(1, TOTAL_ROUNDS),
    matches: firstRoundMatches,
  });

  // Generar rondas vacías siguientes (los ganadores se determinarán al jugar)
  let matchesInRound = BRACKET_SIZE / 2;
  for (let r = 1; r < TOTAL_ROUNDS; r++) {
    matchesInRound = matchesInRound / 2;
    const roundMatches: SingleEliminationMatchDTO[] = [];
    for (let m = 0; m < matchesInRound; m++) {
      roundMatches.push({
        matchNumber: m + 1,
        playerA: null,
        playerB: null,
        bye: false,
      });
    }
    rounds.push({
      roundNumber: r + 1,
      name: roundNameSV(r + 1, TOTAL_ROUNDS),
      matches: roundMatches,
    });
  }

  // Partido por el 3er puesto (opcional)
  if (_input.thirdPlaceMatch) {
    rounds.push({
      roundNumber: TOTAL_ROUNDS + 1,
      name: 'Tercer puesto',
      matches: [
        {
          matchNumber: 1,
          playerA: null,
          playerB: null,
          bye: false,
        },
      ],
    });
  }

  return {
    rounds,
    totalRounds: TOTAL_ROUNDS,
    bracketSize: BRACKET_SIZE,
  };
}

/**
 * Genera posiciones de seeding estándar para un bracket.
 * Ejemplo para bracket de 8: [0, 7, 3, 4, 1, 6, 2, 5]
 * Esto garantiza que los seeds 1 y 2 se enfrenten en la final.
 */
function generateStandardSeedingPositionsSV(_bracketSize: number): number[] {
  if (_bracketSize === 2) return [0, 1];

  const PREV = generateStandardSeedingPositionsSV(_bracketSize / 2);
  const RESULT: number[] = [];

  for (const POS of PREV) {
    RESULT.push(POS);
    RESULT.push(_bracketSize - 1 - POS);
  }

  return RESULT;
}

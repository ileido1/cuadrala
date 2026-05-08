export type RoundRobinScheduleInputDTO = {
  participantUserIds: string[];
  doubleRound?: boolean;
};

export type RoundRobinMatchDTO = {
  matchNumber: number;
  playerA: string;
  playerB: string;
};

export type RoundRobinRoundDTO = {
  roundNumber: number;
  matches: RoundRobinMatchDTO[];
};

export type RoundRobinScheduleDTO = {
  rounds: RoundRobinRoundDTO[];
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
 * Valida reglas de participantes para ROUND_ROBIN.
 * Mínimo 2 participantes; sin duplicados.
 */
function assertParticipantRulesSV(_ids: string[]): void {
  if (!Array.isArray(_ids)) {
    throw new Error('participantUserIds debe ser una lista.');
  }
  if (_ids.length < 2) {
    throw new Error('Se requieren al menos 2 participantes para ROUND_ROBIN.');
  }
  const UNIQUE = new Set(_ids);
  if (UNIQUE.size !== _ids.length) {
    throw new Error('participantUserIds no permite IDs duplicados.');
  }
}

/**
 * Genera la clave determinista para idempotencia.
 */
export function createRoundRobinScheduleKeySV(_input: RoundRobinScheduleInputDTO): string {
  assertParticipantRulesSV(_input.participantUserIds);
  const IDS = normalizeParticipantIdsSV(_input.participantUserIds);
  const SUFFIX = _input.doubleRound ? ':double' : ':single';
  return `round_robin:v1:${IDS.join(',')}${SUFFIX}`;
}

/**
 * Genera rondas ROUND_ROBIN deterministas usando el método del círculo.
 *
 * Algoritmo (circle method):
 * 1. Si N es impar, agregar un "bye" (placeholder)
 * 2. Fijar jugador 0 en posición 0
 * 3. Rotar jugadores 1..N-1 en cada ronda
 * 4. Emparejar jugador[i] vs jugador[N-1-i]
 * 5. Generar N-1 rondas (o 2*(N-1) si doubleRound)
 *
 * Reglas MVP:
 * - Participantes únicos, mínimo 2
 * - Orden estable basado en IDs normalizados
 * - Cada jugador juega exactamente una vez por ronda
 * - Todos contra todos exactamente una vez (o dos si doubleRound)
 */
export function generateRoundRobinScheduleSV(_input: RoundRobinScheduleInputDTO): RoundRobinScheduleDTO {
  assertParticipantRulesSV(_input.participantUserIds);

  const IDS = normalizeParticipantIdsSV(_input.participantUserIds);
  const N = IDS.length;

  // Si N es impar, agregar un bye placeholder
  const IS_ODD = N % 2 !== 0;
  const PLAYER_COUNT = IS_ODD ? N + 1 : N;
  const BYE = '__BYE__';
  const PLAYERS = IS_ODD ? [...IDS, BYE] : [...IDS];

  const ROUNDS_COUNT = PLAYER_COUNT - 1;
  const MATCHES_PER_ROUND = PLAYER_COUNT / 2;

  // Arreglo mutable para rotación (excluye el primero)
  const rotating = PLAYERS.slice(1);

  const rounds: RoundRobinRoundDTO[] = [];

  for (let r = 0; r < ROUNDS_COUNT; r++) {
    const matches: RoundRobinMatchDTO[] = [];

    // Emparejar: primero vs último, segundo vs penúltimo, etc.
    const roundPlayers = [PLAYERS[0], ...rotating];

    for (let m = 0; m < MATCHES_PER_ROUND; m++) {
      const playerA = roundPlayers[m]!;
      const playerB = roundPlayers[PLAYER_COUNT - 1 - m]!;

      // Saltar si alguno es bye
      if (playerA === BYE || playerB === BYE) {
        continue;
      }

      matches.push({
        matchNumber: m + 1,
        playerA,
        playerB,
      });
    }

    rounds.push({
      roundNumber: r + 1,
      matches,
    });

    // Rotar: mover el último al segundo posición
    const LAST = rotating.pop()!;
    rotating.unshift(LAST);
  }

  // Si doubleRound, duplicar rondas con A/B invertidos
  if (_input.doubleRound) {
    const secondLeg: RoundRobinRoundDTO[] = rounds.map((round, idx) => ({
      roundNumber: ROUNDS_COUNT + idx + 1,
      matches: round.matches.map((match) => ({
        matchNumber: match.matchNumber,
        playerA: match.playerB,
        playerB: match.playerA,
      })),
    }));
    rounds.push(...secondLeg);
  }

  return { rounds };
}

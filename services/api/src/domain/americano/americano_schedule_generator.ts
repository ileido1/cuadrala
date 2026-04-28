export type AmericanoRoundDTO = {
  round: number;
  teams: { teamA: [string, string]; teamB: [string, string] }[];
};

export type AmericanoScheduleDTO = {
  participantUserIds: string[];
  rounds: AmericanoRoundDTO[];
};

function normalizeParticipantIdsSV(_participantUserIds: string[]): string[] {
  const UNIQUE = Array.from(new Set(_participantUserIds));
  UNIQUE.sort();
  return UNIQUE;
}

export function buildAmericanoScheduleKeySV(_participantUserIds: string[]): string {
  const IDS = normalizeParticipantIdsSV(_participantUserIds);
  return `americano:v1:${IDS.join(',')}`;
}

/**
 * Genera rondas AMERICANO deterministas.
 *
 * Reglas MVP:
 * - Participantes únicos
 * - Cantidad múltiplo de 4 (para armar partidos 2v2)
 * - Orden estable basado en IDs normalizados
 */
export function generateAmericanoScheduleSV(_participantUserIds: string[]): AmericanoScheduleDTO {
  const IDS = normalizeParticipantIdsSV(_participantUserIds);
  if (IDS.length < 4) {
    throw new Error('PARTICIPANTES_INSUFICIENTES');
  }
  if (IDS.length % 4 !== 0) {
    throw new Error('PARTICIPANTES_INVALIDOS');
  }

  const ROUNDS: AmericanoRoundDTO[] = [];
  const BLOCKS: string[][] = [];
  for (let i = 0; i < IDS.length; i += 4) {
    BLOCKS.push(IDS.slice(i, i + 4));
  }

  const BLOCK_ROUNDS: [number, [number, number], [number, number]][] = [
    [1, [0, 1], [2, 3]],
    [2, [0, 2], [1, 3]],
    [3, [0, 3], [1, 2]],
  ];

  for (const [ROUND_NUMBER, TEAM_A, TEAM_B] of BLOCK_ROUNDS) {
    const TEAMS = BLOCKS.map((_b) => ({
      teamA: [_b[TEAM_A[0]], _b[TEAM_A[1]]] as [string, string],
      teamB: [_b[TEAM_B[0]], _b[TEAM_B[1]]] as [string, string],
    }));
    ROUNDS.push({ round: ROUND_NUMBER, teams: TEAMS });
  }

  return { participantUserIds: IDS, rounds: ROUNDS };
}


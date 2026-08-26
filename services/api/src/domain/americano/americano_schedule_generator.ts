export type AmericanoScheduleInputDTO = {
  participantRegistrationIds: string[];
};

export type AmericanoScheduleDTO = {
  rounds: Array<{
    roundNumber: number;
    courts: Array<{
      courtNumber: number;
      teamA: [string, string];
      teamB: [string, string];
    }>;
  }>;
};

function normalizeParticipantIdsSV(_participantRegistrationIds: string[]): string[] {
  const UNIQUE = Array.from(new Set(_participantRegistrationIds));
  UNIQUE.sort();
  return UNIQUE;
}

function assertParticipantRulesSV(_participantRegistrationIds: string[]): void {
  if (!Array.isArray(_participantRegistrationIds)) {
    throw new Error('participantRegistrationIds debe ser una lista.');
  }
  if (_participantRegistrationIds.length < 4) {
    throw new Error('Se requieren al menos 4 participantes.');
  }
  const UNIQUE = new Set(_participantRegistrationIds);
  if (UNIQUE.size !== _participantRegistrationIds.length) {
    throw new Error('participantRegistrationIds no permite IDs duplicados.');
  }
  if (_participantRegistrationIds.length % 4 !== 0) {
    throw new Error('La cantidad de participantes debe ser múltiplo de 4.');
  }
}

export function createAmericanoScheduleKeySV(_input: AmericanoScheduleInputDTO): string {
  assertParticipantRulesSV(_input.participantRegistrationIds);
  const IDS = normalizeParticipantIdsSV(_input.participantRegistrationIds);
  return `americano:v1:${IDS.join(',')}`;
}

// Back-compat (usado por use case actual)
export function buildAmericanoScheduleKeySV(_participantRegistrationIds: string[]): string {
  return createAmericanoScheduleKeySV({ participantRegistrationIds: _participantRegistrationIds });
}

/**
 * Genera rondas AMERICANO deterministas.
 *
 * Reglas MVP:
 * - Participantes únicos
 * - Cantidad múltiplo de 4 (para armar partidos 2v2)
 * - Orden estable basado en IDs normalizados
 */
export function generateAmericanoScheduleSV(_input: AmericanoScheduleInputDTO | string[]): AmericanoScheduleDTO {
  const IDS_RAW = Array.isArray(_input) ? _input : _input.participantRegistrationIds;
  assertParticipantRulesSV(IDS_RAW);

  // Canonical: orden estable por ID para garantizar determinismo.
  const IDS = normalizeParticipantIdsSV(IDS_RAW);

  // Por cada bloque de 4 participantes generamos 3 rondas (rotación MVP).
  const BLOCKS: string[][] = [];
  for (let i = 0; i < IDS.length; i += 4) {
    BLOCKS.push(IDS.slice(i, i + 4));
  }

  const BLOCK_ROUNDS: Array<{
    roundNumber: number;
    teamAIdx: [number, number];
    teamBIdx: [number, number];
  }> = [
    { roundNumber: 1, teamAIdx: [0, 1], teamBIdx: [2, 3] },
    { roundNumber: 2, teamAIdx: [0, 2], teamBIdx: [1, 3] },
    { roundNumber: 3, teamAIdx: [0, 3], teamBIdx: [1, 2] },
  ];

  const ROUNDS: AmericanoScheduleDTO['rounds'] = BLOCK_ROUNDS.map((_r) => {
    const COURTS = BLOCKS.map((_b, _i) => ({
      courtNumber: _i + 1,
      teamA: [_b[_r.teamAIdx[0]], _b[_r.teamAIdx[1]]] as [string, string],
      teamB: [_b[_r.teamBIdx[0]], _b[_r.teamBIdx[1]]] as [string, string],
    }));
    return { roundNumber: _r.roundNumber, courts: COURTS };
  });

  return { rounds: ROUNDS };
}


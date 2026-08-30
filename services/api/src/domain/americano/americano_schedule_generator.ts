import { AppError } from '../errors/app_error.js';

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

/**
 * @name    :normalizeParticipantIdsSV
 * @version :2.0.0
 * @description :Ordena los IDs para que el calendario sea determinista: la
 * misma entrada en distinto orden produce exactamente la misma salida. No
 * deduplica, porque `assertParticipantRulesSV` ya rechazó los duplicados antes
 * de llegar acá.
 * @param {string[]} _participantRegistrationIds - IDs ya validados
 * @return {string[]} Copia ordenada, sin mutar la entrada
 */
function normalizeParticipantIdsSV(_participantRegistrationIds: string[]): string[] {
  return [..._participantRegistrationIds].sort();
}

/**
 * @name    :assertParticipantRulesSV
 * @version :2.0.0
 * @description :Valida las reglas de participantes del formato AMERICANO.
 * Lanza `AppError` y no `Error` a secas: el roster sale de las inscripciones
 * CONFIRMED, así que "6 inscriptos" es un estado de negocio esperado y debe
 * responder 409, no un 500 con el mensaje tragado.
 * @param {string[]} _participantRegistrationIds - IDs de inscripción del roster
 * @return {void}
 */
function assertParticipantRulesSV(_participantRegistrationIds: string[]): void {
  if (_participantRegistrationIds.length < 4) {
    throw new AppError(
      'PARTICIPANTES_INSUFICIENTES',
      'Se requieren al menos 4 participantes.',
      409,
    );
  }
  const UNIQUE = new Set(_participantRegistrationIds);
  if (UNIQUE.size !== _participantRegistrationIds.length) {
    throw new AppError(
      'PARTICIPANTES_DUPLICADOS',
      'No se permiten participantes duplicados.',
      409,
    );
  }
  if (_participantRegistrationIds.length % 4 !== 0) {
    throw new AppError(
      'PARTICIPANTES_INVALIDOS',
      'La cantidad de participantes debe ser múltiplo de 4.',
      409,
    );
  }
}

/**
 * @name    :createAmericanoScheduleKeySV
 * @version :1.0.0
 * @description :Deriva la key determinista del calendario. Es invariante al
 * orden de entrada, y por eso sirve para detectar que un calendario ya fue
 * generado con el mismo conjunto de participantes (idempotencia).
 * @param {AmericanoScheduleInputDTO} _input - Roster de inscripciones
 * @return {string} Key con formato `americano:v1:<ids ordenados>`
 */
export function createAmericanoScheduleKeySV(_input: AmericanoScheduleInputDTO): string {
  assertParticipantRulesSV(_input.participantRegistrationIds);
  const IDS = normalizeParticipantIdsSV(_input.participantRegistrationIds);
  return `americano:v1:${IDS.join(',')}`;
}

/**
 * @name    :generateAmericanoScheduleSV
 * @version :1.0.0
 * @description :Genera rondas AMERICANO deterministas.
 *
 * Reglas MVP:
 * - Participantes únicos
 * - Cantidad múltiplo de 4 (para armar partidos 2v2)
 * - Orden estable basado en IDs normalizados, así que la misma entrada en
 *   distinto orden produce exactamente el mismo calendario
 * @param {AmericanoScheduleInputDTO} _input - Roster de inscripciones
 * @return {AmericanoScheduleDTO} Rondas con sus canchas y equipos A/B
 */
export function generateAmericanoScheduleSV(_input: AmericanoScheduleInputDTO): AmericanoScheduleDTO {
  assertParticipantRulesSV(_input.participantRegistrationIds);

  // Canonical: orden estable por ID para garantizar determinismo.
  const IDS = normalizeParticipantIdsSV(_input.participantRegistrationIds);

  // Por cada bloque de 4 participantes generamos 3 rondas (rotación MVP).
  //? Invariante: `assertParticipantRulesSV` ya garantizó que la cantidad es
  //? múltiplo de 4, así que todo bloque tiene exactamente 4 IDs. De ahí que más
  //? abajo el acceso por índice pueda afirmarse como `[string, string]`.
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


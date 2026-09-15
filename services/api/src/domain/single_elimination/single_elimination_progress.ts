import { AppError } from '../errors/app_error.js';
import type { SingleEliminationScheduleDTO } from './bracket_generator.js';

/**
 * Resultado ya registrado de un partido de una ronda jugada.
 *
 * `winnerRef`/`loserRef` son identificadores opacos de lado: en singles son
 * el `userId` (o token) del jugador; en duplas son el identificador
 * compartido por los dos jugadores de ese lado (p.ej. `teamLabel` o el id de
 * inscripción del equipo). Esta función nunca inspecciona su contenido — los
 * propaga tal cual — para no asumir singles y perder un lado de duplas.
 */
export type SingleEliminationRecordedResultSV = {
  roundNumber: number;
  matchNumber: number;
  winnerRef: string;
  loserRef: string;
};

/**
 * Progreso resuelto de un partido de ronda > 1 (incluye el partido por el
 * 3er puesto, si existe): las refs opacas que ocupan cada lado según los
 * resultados ya registrados y los byes de primera ronda. `null` cuando ese
 * lado todavía no está resuelto (el partido origen no se jugó).
 */
export type SingleEliminationMatchProgressSV = {
  roundNumber: number;
  matchNumber: number;
  playerARef: string | null;
  playerBRef: string | null;
};

/**
 * Resuelve el avance de un cuadro de eliminación simple, de forma pura y sin
 * efectos secundarios (no toca DB, no crea partidos).
 *
 * Reglas (design D13):
 * - El partido `m` de la ronda `r+1` se completa con los ganadores
 *   registrados de los partidos `2m-1` y `2m` de la ronda `r`.
 * - Un bye de primera ronda (`bracket_generator.ts`) avanza al único jugador
 *   sin resultado registrado: la ref ya está en el bracket original, nunca
 *   se materializa un Match para un bye.
 * - El partido por el 3er puesto (ronda `totalRounds+1`, cuando existe) se
 *   completa con los perdedores de las dos semifinales (ronda
 *   `totalRounds-1`), no con sus ganadores.
 */
export function resolveSingleEliminationProgressSV(_input: {
  schedule: SingleEliminationScheduleDTO;
  results: SingleEliminationRecordedResultSV[];
}): SingleEliminationMatchProgressSV[] {
  const RESULT_BY_KEY = new Map<string, SingleEliminationRecordedResultSV>();
  for (const _result of _input.results) {
    RESULT_BY_KEY.set(matchKeySV(_result.roundNumber, _result.matchNumber), _result);
  }

  const ROUND_BY_NUMBER = new Map(
    _input.schedule.rounds.map((_round) => [_round.roundNumber, _round]),
  );

  //? Ref que avanza desde un partido de la ronda anterior: si ese partido es
  //? un bye de primera ronda avanza directo (sin resultado); si no, toma el
  //? ganador ya registrado, o null si todavía no se jugó.
  function resolveAdvancingRefSV(_roundNumber: number, _matchNumber: number): string | null {
    const SOURCE_MATCH = ROUND_BY_NUMBER.get(_roundNumber)?.matches.find(
      (_match) => _match.matchNumber === _matchNumber,
    );
    if (SOURCE_MATCH?.bye) {
      return SOURCE_MATCH.playerA ?? SOURCE_MATCH.playerB ?? null;
    }
    return RESULT_BY_KEY.get(matchKeySV(_roundNumber, _matchNumber))?.winnerRef ?? null;
  }

  function resolveLosingRefSV(_roundNumber: number, _matchNumber: number): string | null {
    return RESULT_BY_KEY.get(matchKeySV(_roundNumber, _matchNumber))?.loserRef ?? null;
  }

  const PROGRESS: SingleEliminationMatchProgressSV[] = [];

  for (const ROUND of _input.schedule.rounds) {
    if (ROUND.roundNumber === 1) continue;

    if (ROUND.roundNumber === _input.schedule.totalRounds + 1) {
      //? Partido por el 3er puesto: la única ronda anterior a la final son
      //? las semifinales, y toma sus perdedores, no sus ganadores.
      const SEMIFINAL_ROUND_NUMBER = _input.schedule.totalRounds - 1;
      for (const MATCH of ROUND.matches) {
        PROGRESS.push({
          roundNumber: ROUND.roundNumber,
          matchNumber: MATCH.matchNumber,
          playerARef: resolveLosingRefSV(SEMIFINAL_ROUND_NUMBER, 1),
          playerBRef: resolveLosingRefSV(SEMIFINAL_ROUND_NUMBER, 2),
        });
      }
      continue;
    }

    const SOURCE_ROUND_NUMBER = ROUND.roundNumber - 1;
    for (const MATCH of ROUND.matches) {
      PROGRESS.push({
        roundNumber: ROUND.roundNumber,
        matchNumber: MATCH.matchNumber,
        playerARef: resolveAdvancingRefSV(SOURCE_ROUND_NUMBER, MATCH.matchNumber * 2 - 1),
        playerBRef: resolveAdvancingRefSV(SOURCE_ROUND_NUMBER, MATCH.matchNumber * 2),
      });
    }
  }

  return PROGRESS;
}

function matchKeySV(_roundNumber: number, _matchNumber: number): string {
  return `${_roundNumber}:${_matchNumber}`;
}

/**
 * Inscripción tal como la necesita el avance (S7c-1): su usuario y, si
 * corresponde, la pareja fija con la que juega. Mismo shape mínimo que usa
 * `MaterializeTournamentMatchesUseCase` para materializar el cuadro inicial.
 */
export type SingleEliminationAdvancementRegistrationSV = {
  id: string;
  userId: string | null;
  partnerRegistrationId: string | null;
};

export type SingleEliminationAdvancementParticipantSV = {
  userId: string | null;
  tournamentRegistrationId: string;
  teamLabel: string | null;
};

/**
 * Expande la ref opaca de un lado ya resuelto (`playerARef`/`playerBRef` de
 * `resolveSingleEliminationProgressSV`, un `TournamentRegistration.id`) en
 * sus `MatchParticipant` a materializar en la ronda siguiente.
 *
 * En duplas fijas agrega la pareja (`partnerRegistrationId`), con el mismo
 * `teamLabel` para ambos — igual regla que usa la materialización inicial
 * del cuadro (`MaterializeTournamentMatchesUseCase`) para no partir una
 * pareja entre rondas. En singles es un único participante sin lado.
 */
export function resolveSingleEliminationAdvancementParticipantsSV(_input: {
  ref: string;
  teamLabel: 'A' | 'B';
  registrationById: Map<string, SingleEliminationAdvancementRegistrationSV>;
}): SingleEliminationAdvancementParticipantSV[] {
  const REGISTRATION = _input.registrationById.get(_input.ref);
  if (REGISTRATION === undefined) {
    throw new AppError(
      'CALENDARIO_OBSOLETO',
      'El calendario está desactualizado; regenera el calendario del torneo.',
      409,
    );
  }

  const PARTNER_ID = REGISTRATION.partnerRegistrationId;
  if (PARTNER_ID === null) {
    return [
      { userId: REGISTRATION.userId, tournamentRegistrationId: REGISTRATION.id, teamLabel: null },
    ];
  }

  const PARTNER = _input.registrationById.get(PARTNER_ID);
  if (PARTNER === undefined) {
    throw new AppError(
      'CALENDARIO_OBSOLETO',
      'El calendario está desactualizado; regenera el calendario del torneo.',
      409,
    );
  }

  return [
    { userId: REGISTRATION.userId, tournamentRegistrationId: REGISTRATION.id, teamLabel: _input.teamLabel },
    { userId: PARTNER.userId, tournamentRegistrationId: PARTNER.id, teamLabel: _input.teamLabel },
  ];
}

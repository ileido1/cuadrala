import { AppError } from '../errors/app_error.js';
import type { AmericanoScheduleDTO } from '../americano/americano_schedule_generator.js';
import type { RoundRobinScheduleDTO } from '../round_robin/round_robin_schedule_generator.js';
import type { SingleEliminationScheduleDTO } from '../single_elimination/bracket_generator.js';

/**
 * `participantRef` es un token opaco de inscripción (`TournamentRegistration.id`), no un `userId`.
 * Desde Slice 1 (tournament-guest-registration) el calendario referencia inscripciones, ya que las
 * inscripciones GUEST no tienen `userId`. La resolución a `{userId | null, tournamentRegistrationId}`
 * ocurre en `MaterializeTournamentMatchesUseCase`, que sí conoce el roster del torneo.
 */
export type MaterializedMatchParticipantPlanDTO = {
  participantRef: string;
  teamLabel: string | null;
};

export type MaterializedMatchPlanDTO = {
  roundNumber: number;
  matchNumber: number;
  participants: MaterializedMatchParticipantPlanDTO[];
};

/**
 * Mapea el payload de un `TournamentSchedule` (formato-específico) a una lista plana
 * de planes de partido a materializar. Función de dominio pura: no depende de
 * infraestructura ni de `_req`, y no asigna `scheduledAt`/`courtId` (responsabilidad
 * del caso de uso, que conoce el `Tournament`).
 *
 * Los "byes" (partidos sin ambos jugadores definidos, típicos de la primera ronda de
 * SINGLE_ELIMINATION con bracket incompleto) se omiten: no hay contra quién jugar.
 */
export function buildMaterializedMatchPlansSV(_input: {
  formatCode: string;
  payload: unknown;
}): MaterializedMatchPlanDTO[] {
  //? 1. AMERICANO: cada cancha de cada ronda es un partido 2v2 (teamA vs teamB)
  if (_input.formatCode === 'AMERICANO') {
    const PAYLOAD = _input.payload as AmericanoScheduleDTO;
    const PLANS: MaterializedMatchPlanDTO[] = [];
    for (const ROUND of PAYLOAD.rounds) {
      for (const COURT of ROUND.courts) {
        PLANS.push({
          roundNumber: ROUND.roundNumber,
          matchNumber: COURT.courtNumber,
          participants: [
            { participantRef: COURT.teamA[0], teamLabel: 'A' },
            { participantRef: COURT.teamA[1], teamLabel: 'A' },
            { participantRef: COURT.teamB[0], teamLabel: 'B' },
            { participantRef: COURT.teamB[1], teamLabel: 'B' },
          ],
        });
      }
    }
    return PLANS;
  }

  //? 2. ROUND_ROBIN: cada partido de cada ronda es un 1v1 (playerA vs playerB)
  if (_input.formatCode === 'ROUND_ROBIN') {
    const PAYLOAD = _input.payload as RoundRobinScheduleDTO;
    const PLANS: MaterializedMatchPlanDTO[] = [];
    for (const ROUND of PAYLOAD.rounds) {
      for (const MATCH of ROUND.matches) {
        PLANS.push({
          roundNumber: ROUND.roundNumber,
          matchNumber: MATCH.matchNumber,
          participants: [
            { participantRef: MATCH.playerA, teamLabel: null },
            { participantRef: MATCH.playerB, teamLabel: null },
          ],
        });
      }
    }
    return PLANS;
  }

  //? 3. SINGLE_ELIMINATION: solo se materializan los partidos con ambos jugadores ya
  //? definidos y sin bye; las rondas siguientes dependen de resultados aún no jugados.
  if (_input.formatCode === 'SINGLE_ELIMINATION') {
    const PAYLOAD = _input.payload as SingleEliminationScheduleDTO;
    const PLANS: MaterializedMatchPlanDTO[] = [];
    for (const ROUND of PAYLOAD.rounds) {
      for (const MATCH of ROUND.matches) {
        if (MATCH.bye || MATCH.playerA === null || MATCH.playerB === null) {
          continue;
        }
        PLANS.push({
          roundNumber: ROUND.roundNumber,
          matchNumber: MATCH.matchNumber,
          participants: [
            { participantRef: MATCH.playerA, teamLabel: null },
            { participantRef: MATCH.playerB, teamLabel: null },
          ],
        });
      }
    }
    return PLANS;
  }

  throw new AppError(
    'FORMATO_NO_SOPORTADO',
    'Formato no soportado para materialización de partidos.',
    501,
  );
}

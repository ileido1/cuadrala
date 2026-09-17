import { AppError } from '../../domain/errors/app_error.js';
import { buildMaterializedMatchPlansSV } from '../../domain/tournament/tournament_match_materialization.js';
import {
  resolveSlotDecisionSV,
  type TournamentSlotDecision,
} from '../../domain/tournament/tournament_slot_decision.js';
import type { MatchCourtAvailabilityRepository } from '../../domain/ports/match_court_availability_repository.js';
import type {
  TournamentMatchResultRepository,
  TournamentMatchStateScoreSV,
  TournamentMatchStateSideSV,
} from '../../domain/ports/tournament_match_result_repository.js';
import type { TournamentRegistrationRepository } from '../../domain/ports/tournament_registration_repository.js';
import type { TournamentRepository } from '../../domain/ports/tournament_repository.js';
import type { TournamentScheduleRepository } from '../../domain/ports/tournament_schedule_repository.js';
import type { TournamentSlotResponseRepository } from './respond_tournament_slot.use_case.js';

export type TournamentScheduleMatchViewDTO = {
  id: string;
  roundNumber: number;
  matchNumber: number;
  /** "Ana · Marcos vs Lucia · Diego". */
  label: string;
  scheduledAt: Date | null;
  courtId: string | null;
  courtName: string | null;
  /** `Match.id` real, `null` cuando el partido aún no se materializó. */
  matchId: string | null;
  /** `Match.status` (`SCHEDULED`/`IN_PROGRESS`/`FINISHED`/`CANCELLED`), `null` sin materializar. */
  matchStatus: string | null;
  /** Como quedo el turno propuesto segun las respuestas de los jugadores. */
  decision: TournamentSlotDecision;
  /** Nombre de quien rechazo el turno, solo cuando `decision === 'REJECTED'`. */
  rejectedByName: string | null;
  /** Lados del partido (`teamLabel ?? userId`), vacio sin materializar. */
  sides: TournamentMatchStateSideSV[];
  /** Puntajes cargados, vacio sin resultado registrado. */
  scores: TournamentMatchStateScoreSV[];
};

export type TournamentScheduleRoundViewDTO = {
  name: string;
  matches: TournamentScheduleMatchViewDTO[];
};

export class GetTournamentScheduleUseCase {
  constructor(
    private readonly _tournamentRepository: TournamentRepository,
    private readonly _tournamentScheduleRepository: TournamentScheduleRepository,
    private readonly _registrationRepository: TournamentRegistrationRepository | null = null,
    private readonly _courtRepository: MatchCourtAvailabilityRepository | null = null,
    private readonly _matchResultRepository: TournamentMatchResultRepository | null = null,
    private readonly _slotResponseRepository: TournamentSlotResponseRepository | null = null,
  ) {}

  async executeSV(_tournamentId: string): Promise<{
    tournamentId: string;
    formatCode: string;
    scheduleKey: string;
    payload: unknown;
    rounds: TournamentScheduleRoundViewDTO[];
  }> {
    const TOURNAMENT = await this._tournamentRepository.findByIdSV(_tournamentId);
    if (TOURNAMENT === null) {
      throw new AppError('TORNEO_NO_ENCONTRADO', 'El torneo indicado no existe.', 404);
    }

    const SCHEDULE = await this._tournamentScheduleRepository.findByTournamentIdSV(_tournamentId);
    if (SCHEDULE === null) {
      throw new AppError('SCHEDULE_NO_ENCONTRADO', 'El calendario aún no ha sido generado.', 404);
    }

    return {
      tournamentId: SCHEDULE.tournamentId,
      formatCode: SCHEDULE.formatCode,
      scheduleKey: SCHEDULE.scheduleKey,
      //? `payload` se mantiene por compatibilidad: es el cuadro crudo del
      //? formato. `rounds` es la vista lista para mostrar.
      payload: SCHEDULE.payload,
      rounds: await this._buildRoundsSV(TOURNAMENT, SCHEDULE),
    };
  }

  /**
   * Arma el cuadro para mostrar: quien contra quien, cuando y donde.
   *
   * El endpoint devolvia solo `payload` —tokens de inscripcion, sin nombres ni
   * horarios— mientras el cliente esperaba `rounds`, asi que la pestana de
   * calendario mostraba vacio en silencio.
   */
  private async _buildRoundsSV(
    _tournament: { venueId: string | null },
    _schedule: {
      tournamentId: string;
      scheduleKey: string;
      formatCode: string;
      payload: unknown;
      slotPlan: Array<{
        roundNumber: number;
        matchNumber: number;
        courtId: string;
        scheduledAt: Date;
      }> | null;
    },
  ): Promise<TournamentScheduleRoundViewDTO[]> {
    if (this._registrationRepository === null) return [];

    const REGISTRATIONS = await this._registrationRepository.listByTournamentIdSV(
      _schedule.tournamentId,
    );
    const BY_ID = new Map(REGISTRATIONS.map((_r) => [_r.id, _r]));
    const NAME_BY_USER_ID = new Map(
      REGISTRATIONS.filter(
        (_r): _r is typeof _r & { userId: string } => _r.userId !== null,
      ).map((_r) => [_r.userId, displayNameSV(_r)]),
    );

    const COURTS =
      _tournament.venueId === null || this._courtRepository === null
        ? []
        : await this._courtRepository.listVenueCourtsSV(_tournament.venueId);
    const COURT_NAME_BY_ID = new Map(COURTS.map((_c) => [_c.id, _c.name]));

    const SLOT_BY_MATCH = new Map(
      (_schedule.slotPlan ?? []).map((_s) => [`${_s.roundNumber}|${_s.matchNumber}`, _s]),
    );

    //? D2: una sola consulta por calendario, nunca una por slot del cuadro.
    const MATCH_STATES =
      this._matchResultRepository === null
        ? []
        : await this._matchResultRepository.listTournamentMatchStatesSV({
            tournamentId: _schedule.tournamentId,
            scheduleKey: _schedule.scheduleKey,
          });
    const STATE_BY_MATCH = new Map(
      MATCH_STATES.map((_s) => [`${_s.roundNumber}|${_s.matchNumber}`, _s]),
    );

    let plans;
    try {
      plans = buildMaterializedMatchPlansSV({
        formatCode: _schedule.formatCode,
        payload: _schedule.payload,
      });
    } catch {
      //? Un formato que el dominio no sabe leer no puede tirar abajo la lectura
      //? del calendario: se devuelve vacio y el cliente muestra el estado vacio.
      return [];
    }

    const BY_ROUND = new Map<number, TournamentScheduleMatchViewDTO[]>();

    for (const PLAN of plans) {
      //? Cada token puede ser una persona o una dupla: se expande igual que al
      //? materializar, para que el label diga quien juega de verdad.
      const SIDES = PLAN.participants.map((_p) => {
        const REGISTRATION = BY_ID.get(_p.participantRef);
        if (REGISTRATION === undefined) return [];
        const MEMBERS = [REGISTRATION];
        const PARTNER_ID = REGISTRATION.partnerRegistrationId ?? null;
        if (PARTNER_ID !== null) {
          const PARTNER = BY_ID.get(PARTNER_ID);
          if (PARTNER !== undefined) MEMBERS.push(PARTNER);
        }
        return MEMBERS;
      });

      const SLOT = SLOT_BY_MATCH.get(`${PLAN.roundNumber}|${PLAN.matchNumber}`);
      const STATE = STATE_BY_MATCH.get(`${PLAN.roundNumber}|${PLAN.matchNumber}`) ?? null;
      const LIST = BY_ROUND.get(PLAN.roundNumber) ?? [];

      //? El turno propuesto se acepta/rechaza independientemente de que el
      //? Match ya este materializado: la respuesta vive por roundNumber/matchNumber.
      const PARTICIPANT_USER_IDS = SIDES.flat()
        .map((_r) => _r.userId)
        .filter((_id): _id is string => _id !== null);
      const RESPONSES =
        this._slotResponseRepository === null
          ? []
          : await this._slotResponseRepository.listByMatchSV({
              tournamentId: _schedule.tournamentId,
              roundNumber: PLAN.roundNumber,
              matchNumber: PLAN.matchNumber,
            });
      const ACCOUNT_RESPONSES = RESPONSES.flatMap((_response) =>
        _response.userId === null
          ? []
          : [{ userId: _response.userId, response: _response.response }],
      );
      const DECISION = resolveSlotDecisionSV({
        participantUserIds: PARTICIPANT_USER_IDS,
        responses: ACCOUNT_RESPONSES,
      });
      const REJECTED_RESPONSE = ACCOUNT_RESPONSES.find(
        (_r) => _r.response === 'REJECTED' && PARTICIPANT_USER_IDS.includes(_r.userId),
      );

      LIST.push({
        id: `${PLAN.roundNumber}-${PLAN.matchNumber}`,
        roundNumber: PLAN.roundNumber,
        matchNumber: PLAN.matchNumber,
        label: SIDES.map((_side) => _side.map(displayNameSV).join(' · ')).join(' vs '),
        scheduledAt: SLOT?.scheduledAt ?? null,
        courtId: SLOT?.courtId ?? null,
        courtName: SLOT === undefined ? null : COURT_NAME_BY_ID.get(SLOT.courtId) ?? null,
        matchId: STATE?.matchId ?? null,
        matchStatus: STATE?.matchStatus ?? null,
        decision: DECISION,
        rejectedByName:
          DECISION === 'REJECTED' && REJECTED_RESPONSE !== undefined
            ? NAME_BY_USER_ID.get(REJECTED_RESPONSE.userId) ?? null
            : null,
        sides: STATE?.sides ?? [],
        scores: STATE?.scores ?? [],
      });
      BY_ROUND.set(PLAN.roundNumber, LIST);
    }

    return [...BY_ROUND.entries()]
      .sort((_a, _b) => _a[0] - _b[0])
      .map(([_roundNumber, _matches]) => ({
        name: `Ronda ${_roundNumber}`,
        matches: _matches.sort((_a, _b) => _a.matchNumber - _b.matchNumber),
      }));
  }
}

function displayNameSV(_registration: {
  userName: string | null;
  guestName: string | null;
}): string {
  return _registration.userName ?? _registration.guestName ?? 'Jugador';
}

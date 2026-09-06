import { AppError } from '../../domain/errors/app_error.js';
import { buildMaterializedMatchPlansSV } from '../../domain/tournament/tournament_match_materialization.js';
import {
  resolveSlotDecisionSV,
  type TournamentSlotDecision,
  type TournamentSlotResponseValue,
} from '../../domain/tournament/tournament_slot_decision.js';
import type { MatchCourtAvailabilityRepository } from '../../domain/ports/match_court_availability_repository.js';
import type { TournamentRegistrationRepository } from '../../domain/ports/tournament_registration_repository.js';
import type { TournamentRepository } from '../../domain/ports/tournament_repository.js';
import type { TournamentScheduleRepository } from '../../domain/ports/tournament_schedule_repository.js';
import type { TournamentSlotResponseRepository } from './respond_tournament_slot.use_case.js';

export type MyTournamentMatchDTO = {
  roundNumber: number;
  matchNumber: number;
  scheduledAt: Date | null;
  courtId: string | null;
  courtName: string | null;
  /** Con quien juego (en duplas fijas y en americano). */
  partners: string[];
  /** Contra quien juego. */
  opponents: string[];
  /** Que contesto este jugador, o `null` si todavia no contesto. */
  myResponse: TournamentSlotResponseValue | null;
  /** Como quedo el partido con las respuestas de todos. */
  decision: TournamentSlotDecision;
};

/**
 * Los partidos de un jugador en un torneo, con dia, hora, cancha y rival.
 *
 * Responde la pregunta concreta —"cuando y donde juego"— en vez de devolver el
 * cuadro entero para que el cliente lo recorra buscandose. El jugador quiere
 * sus partidos; el bracket completo es otra pantalla.
 */
export class ListMyTournamentMatchesUseCase {
  constructor(
    private readonly _tournamentRepository: TournamentRepository,
    private readonly _scheduleRepository: TournamentScheduleRepository,
    private readonly _registrationRepository: TournamentRegistrationRepository,
    private readonly _responseRepository: TournamentSlotResponseRepository,
    private readonly _courtRepository: MatchCourtAvailabilityRepository,
  ) {}

  async executeSV(_input: {
    tournamentId: string;
    actorUserId: string;
  }): Promise<{ items: MyTournamentMatchDTO[] }> {
    const TOURNAMENT = await this._tournamentRepository.findByIdSV(_input.tournamentId);
    if (TOURNAMENT === null) {
      throw new AppError('TORNEO_NO_ENCONTRADO', 'El torneo indicado no existe.', 404);
    }

    const SCHEDULE = await this._scheduleRepository.findByTournamentIdSV(_input.tournamentId);
    //? Sin calendario no hay partidos que mostrar. Es un estado normal del
    //? torneo, no un error: devolver vacio le deja a la app mostrar "todavia no
    //? se genero el cuadro".
    if (SCHEDULE === null) return { items: [] };

    const REGISTRATIONS = await this._registrationRepository.listByTournamentIdSV(
      _input.tournamentId,
    );
    const BY_REGISTRATION_ID = new Map(REGISTRATIONS.map((_r) => [_r.id, _r]));

    const COURTS =
      TOURNAMENT.venueId === null
        ? []
        : await this._courtRepository.listVenueCourtsSV(TOURNAMENT.venueId);
    const COURT_NAME_BY_ID = new Map(COURTS.map((_c) => [_c.id, _c.name]));

    const SLOT_BY_MATCH = new Map(
      (SCHEDULE.slotPlan ?? []).map((_s) => [`${_s.roundNumber}|${_s.matchNumber}`, _s]),
    );

    const PLANS = buildMaterializedMatchPlansSV({
      formatCode: SCHEDULE.formatCode,
      payload: SCHEDULE.payload,
    });

    const ITEMS: MyTournamentMatchDTO[] = [];

    for (const PLAN of PLANS) {
      //? Cada token del cuadro puede ser una persona o una dupla: se expande
      //? igual que al materializar, para saber quien juega de verdad.
      const SIDES = PLAN.participants.map((_p) => {
        const REGISTRATION = BY_REGISTRATION_ID.get(_p.participantRef);
        if (REGISTRATION === undefined) return [];

        const MEMBERS = [REGISTRATION];
        const PARTNER_ID = REGISTRATION.partnerRegistrationId ?? null;
        if (PARTNER_ID !== null) {
          const PARTNER = BY_REGISTRATION_ID.get(PARTNER_ID);
          if (PARTNER !== undefined) MEMBERS.push(PARTNER);
        }
        return MEMBERS;
      });

      const MY_SIDE_INDEX = SIDES.findIndex((_side) =>
        _side.some((_r) => _r.userId === _input.actorUserId),
      );
      if (MY_SIDE_INDEX < 0) continue;

      const PARTNERS = (SIDES[MY_SIDE_INDEX] ?? [])
        .filter((_r) => _r.userId !== _input.actorUserId)
        .map(displayNameSV);
      const OPPONENTS = SIDES.filter((_s, _i) => _i !== MY_SIDE_INDEX)
        .flat()
        .map(displayNameSV);

      const RESPONSES = await this._responseRepository.listByMatchSV({
        tournamentId: _input.tournamentId,
        roundNumber: PLAN.roundNumber,
        matchNumber: PLAN.matchNumber,
      });

      const PARTICIPANT_USER_IDS = SIDES.flat()
        .map((_r) => _r.userId)
        .filter((_id): _id is string => _id !== null);

      const SLOT = SLOT_BY_MATCH.get(`${PLAN.roundNumber}|${PLAN.matchNumber}`);

      ITEMS.push({
        roundNumber: PLAN.roundNumber,
        matchNumber: PLAN.matchNumber,
        scheduledAt: SLOT?.scheduledAt ?? null,
        courtId: SLOT?.courtId ?? null,
        courtName: SLOT === undefined ? null : COURT_NAME_BY_ID.get(SLOT.courtId) ?? null,
        partners: PARTNERS,
        opponents: OPPONENTS,
        myResponse:
          RESPONSES.find((_r) => _r.userId === _input.actorUserId)?.response ?? null,
        decision: resolveSlotDecisionSV({
          participantUserIds: PARTICIPANT_USER_IDS,
          responses: RESPONSES,
        }),
      });
    }

    //? En orden de juego: es como el jugador los va a mirar.
    ITEMS.sort(
      (_a, _b) =>
        _a.roundNumber - _b.roundNumber || _a.matchNumber - _b.matchNumber,
    );
    return { items: ITEMS };
  }
}

function displayNameSV(_registration: {
  userName: string | null;
  guestName: string | null;
}): string {
  return _registration.userName ?? _registration.guestName ?? 'Jugador';
}

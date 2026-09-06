import { AppError } from '../../domain/errors/app_error.js';
import { buildMaterializedMatchPlansSV } from '../../domain/tournament/tournament_match_materialization.js';
import type { MatchCourtAvailabilityRepository } from '../../domain/ports/match_court_availability_repository.js';
import type { TournamentRegistrationRepository } from '../../domain/ports/tournament_registration_repository.js';
import type { TournamentRepository } from '../../domain/ports/tournament_repository.js';
import type { TournamentScheduleRepository } from '../../domain/ports/tournament_schedule_repository.js';

export type TournamentScheduleMatchViewDTO = {
  id: string;
  roundNumber: number;
  matchNumber: number;
  /** "Ana · Marcos vs Lucia · Diego". */
  label: string;
  scheduledAt: Date | null;
  courtId: string | null;
  courtName: string | null;
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

    const COURTS =
      _tournament.venueId === null || this._courtRepository === null
        ? []
        : await this._courtRepository.listVenueCourtsSV(_tournament.venueId);
    const COURT_NAME_BY_ID = new Map(COURTS.map((_c) => [_c.id, _c.name]));

    const SLOT_BY_MATCH = new Map(
      (_schedule.slotPlan ?? []).map((_s) => [`${_s.roundNumber}|${_s.matchNumber}`, _s]),
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
      const LIST = BY_ROUND.get(PLAN.roundNumber) ?? [];

      LIST.push({
        id: `${PLAN.roundNumber}-${PLAN.matchNumber}`,
        roundNumber: PLAN.roundNumber,
        matchNumber: PLAN.matchNumber,
        label: SIDES.map((_side) => _side.map(displayNameSV).join(' · ')).join(' vs '),
        scheduledAt: SLOT?.scheduledAt ?? null,
        courtId: SLOT?.courtId ?? null,
        courtName: SLOT === undefined ? null : COURT_NAME_BY_ID.get(SLOT.courtId) ?? null,
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

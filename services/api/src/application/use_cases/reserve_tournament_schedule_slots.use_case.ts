import {
  planTournamentMatchSlotsSV,
  slotKeySV,
  type PlannedMatchSlot,
  type TournamentMatchRef,
} from '../../domain/tournament/tournament_slot_planner.js';
import { holdExpiresAtSV } from '../../domain/reservation/reservation_slot.js';
import type { MatchCourtAvailabilityRepository } from '../../domain/ports/match_court_availability_repository.js';

/** Cuanto dura un partido de torneo mientras no haya duracion por formato. */
const DEFAULT_MATCH_MINUTES = 60;

/** Hasta donde se mira la agenda de la sede al planificar. */
const PLANNING_WINDOW_DAYS = 14;

export type TournamentSlotHoldRepository = {
  /**
   * Aparta los turnos del cuadro, en una sola transaccion.
   *
   * Devuelve los que no pudo apartar porque alguien gano la carrera: entre que
   * se leyo la agenda y se escribe, otra reserva pudo tomar el turno. El indice
   * parcial de la base es el arbitro, no esta lectura.
   */
  holdSlotsSV(_input: {
    tournamentId: string;
    venueId: string;
    sportId: string;
    categoryId: string;
    createdByUserId: string;
    holdExpiresAt: Date;
    slots: PlannedMatchSlot[];
  }): Promise<{ heldSlots: PlannedMatchSlot[]; lostSlots: PlannedMatchSlot[] }>;
};

/**
 * Aparta las canchas del cuadro contra la disponibilidad real de la sede.
 *
 * Los turnos quedan `HELD`: bloquean la cancha para que nadie mas la tome, y se
 * sueltan solos si nadie los confirma. Recien pasan a firmes cuando los
 * jugadores aceptan su horario.
 *
 * No falla si no alcanza: devuelve los partidos que quedaron sin turno para que
 * el organizador los ubique a mano. Un torneo a medio planificar es informacion
 * util; un error que tira abajo la generacion del cuadro no lo es.
 */
export class ReserveTournamentScheduleSlotsUseCase {
  constructor(
    private readonly _courtAvailabilityRepository: MatchCourtAvailabilityRepository,
    private readonly _holdRepository: TournamentSlotHoldRepository,
  ) {}

  async executeSV(_input: {
    tournamentId: string;
    venueId: string | null;
    sportId: string;
    categoryId: string;
    organizerUserId: string;
    startsAt: Date | null;
    plans: TournamentMatchRef[];
    now?: Date;
  }): Promise<{ slots: PlannedMatchSlot[]; unplaced: TournamentMatchRef[] }> {
    //? Un torneo sin sede o sin fecha no tiene contra que planificar. Se
    //? devuelve todo sin ubicar en vez de inventar horarios.
    if (_input.venueId === null || _input.startsAt === null) {
      return { slots: [], unplaced: _input.plans };
    }

    const COURTS = await this._courtAvailabilityRepository.listVenueCourtsSV(_input.venueId);
    const COURT_IDS = COURTS.map((_c) => _c.id);

    const WINDOW_END = new Date(
      _input.startsAt.getTime() + PLANNING_WINDOW_DAYS * 24 * 60 * 60 * 1000,
    );
    const OCCUPIED = await this._courtAvailabilityRepository.listLiveReservationSlotsSV({
      venueId: _input.venueId,
      from: _input.startsAt,
      to: WINDOW_END,
    });

    const PLAN = planTournamentMatchSlotsSV({
      plans: _input.plans,
      courtIds: COURT_IDS,
      startsAt: _input.startsAt,
      slotMinutes: DEFAULT_MATCH_MINUTES,
      occupiedSlots: new Set(OCCUPIED.map((_o) => slotKeySV(_o.courtId, _o.scheduledAt))),
    });

    if (PLAN.slots.length === 0) {
      return { slots: [], unplaced: PLAN.unplaced };
    }

    const HELD = await this._holdRepository.holdSlotsSV({
      tournamentId: _input.tournamentId,
      venueId: _input.venueId,
      sportId: _input.sportId,
      categoryId: _input.categoryId,
      createdByUserId: _input.organizerUserId,
      holdExpiresAt: holdExpiresAtSV(_input.now ?? new Date()),
      slots: PLAN.slots,
    });

    //? Los que se perdieron en la carrera se reportan sin turno, igual que los
    //? que nunca entraron: para el organizador son el mismo problema.
    return {
      slots: HELD.heldSlots,
      unplaced: [
        ...PLAN.unplaced,
        ...HELD.lostSlots.map((_s) => ({
          roundNumber: _s.roundNumber,
          matchNumber: _s.matchNumber,
        })),
      ],
    };
  }
}

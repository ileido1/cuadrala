import { AppError } from '../../domain/errors/app_error.js';
import { holdExpiresAtSV } from '../../domain/reservation/reservation_slot.js';
import type { TournamentScheduleRepository } from '../../domain/ports/tournament_schedule_repository.js';
import type { TournamentRepository } from '../../domain/ports/tournament_repository.js';
import type { AssertTournamentOrganizerAccessUseCase } from './assert_tournament_organizer_access.use_case.js';
import type { TournamentSlotHoldRepository } from './reserve_tournament_schedule_slots.use_case.js';
import type {
  TournamentSlotHoldLifecycleRepository,
  TournamentSlotResponseRepository,
} from './respond_tournament_slot.use_case.js';

/**
 * El organizador mueve un partido a otro horario o cancha.
 *
 * Es la salida que hace viable pedirles el OK a los jugadores: cuando alguien
 * rechaza —o no contesta y el turno vence— el partido vuelve al organizador, y
 * sin esta operacion se quedaria ahi para siempre.
 */
export class RescheduleTournamentMatchUseCase {
  constructor(
    private readonly _tournamentRepository: TournamentRepository,
    private readonly _scheduleRepository: TournamentScheduleRepository,
    private readonly _assertOrganizerAccess: AssertTournamentOrganizerAccessUseCase,
    private readonly _holdLifecycleRepository: TournamentSlotHoldLifecycleRepository,
    private readonly _holdRepository: TournamentSlotHoldRepository,
    private readonly _responseRepository: TournamentSlotResponseRepository,
  ) {}

  async executeSV(_input: {
    tournamentId: string;
    roundNumber: number;
    matchNumber: number;
    courtId: string;
    scheduledAt: Date;
    actorUserId: string;
    now?: Date;
  }): Promise<{ moved: true }> {
    const TOURNAMENT = await this._tournamentRepository.findByIdSV(_input.tournamentId);
    if (TOURNAMENT === null) {
      throw new AppError('TORNEO_NO_ENCONTRADO', 'El torneo indicado no existe.', 404);
    }
    if (TOURNAMENT.venueId === null) {
      throw new AppError(
        'TORNEO_SIN_SEDE',
        'El torneo no tiene sede, así que no hay canchas para asignar.',
        409,
      );
    }

    await this._assertOrganizerAccess.executeSV({
      actorUserId: _input.actorUserId,
      organizerUserId: TOURNAMENT.organizerUserId,
      venueId: TOURNAMENT.venueId,
    });

    const SCHEDULE = await this._scheduleRepository.findByTournamentIdSV(_input.tournamentId);
    if (SCHEDULE === null) {
      throw new AppError('CALENDARIO_NO_GENERADO', 'El torneo todavía no tiene calendario.', 404);
    }

    const PLAN = SCHEDULE.slotPlan ?? [];
    const CURRENT = PLAN.find(
      (_s) => _s.roundNumber === _input.roundNumber && _s.matchNumber === _input.matchNumber,
    );

    const NEXT_SLOT = {
      roundNumber: _input.roundNumber,
      matchNumber: _input.matchNumber,
      courtId: _input.courtId,
      scheduledAt: _input.scheduledAt,
    };

    //? Se aparta el turno nuevo ANTES de soltar el viejo: si la cancha destino
    //? ya estaba tomada, el partido se queda donde estaba en vez de perder los
    //? dos turnos y quedar sin horario.
    const HELD = await this._holdRepository.holdSlotsSV({
      tournamentId: _input.tournamentId,
      venueId: TOURNAMENT.venueId,
      sportId: TOURNAMENT.sportId,
      categoryId: TOURNAMENT.categoryId,
      createdByUserId: TOURNAMENT.organizerUserId ?? _input.actorUserId,
      holdExpiresAt: holdExpiresAtSV(_input.now ?? new Date()),
      slots: [NEXT_SLOT],
    });

    if (HELD.heldSlots.length === 0) {
      throw new AppError(
        'CONFLICTO',
        'Ese horario ya está tomado en esa cancha.',
        409,
      );
    }

    if (CURRENT !== undefined) {
      await this._holdLifecycleRepository.releaseHoldSV({
        courtId: CURRENT.courtId,
        scheduledAt: CURRENT.scheduledAt,
      });
    }

    await this._scheduleRepository.saveSlotPlanSV({
      tournamentId: _input.tournamentId,
      slotPlan: [
        ...PLAN.filter(
          (_s) =>
            _s.roundNumber !== _input.roundNumber || _s.matchNumber !== _input.matchNumber,
        ),
        NEXT_SLOT,
      ],
    });

    //? Las respuestas eran sobre el horario viejo. Dejarlas comprometeria a
    //? quien acepto el martes con un partido que ahora es el jueves: hay que
    //? volver a preguntar.
    await this._responseRepository.deleteByMatchSV({
      tournamentId: _input.tournamentId,
      roundNumber: _input.roundNumber,
      matchNumber: _input.matchNumber,
    });

    return { moved: true };
  }
}

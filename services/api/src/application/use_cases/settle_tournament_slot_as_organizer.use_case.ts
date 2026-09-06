import { AppError } from '../../domain/errors/app_error.js';
import type { TournamentScheduleRepository } from '../../domain/ports/tournament_schedule_repository.js';
import type { TournamentRepository } from '../../domain/ports/tournament_repository.js';
import type { AssertTournamentOrganizerAccessUseCase } from './assert_tournament_organizer_access.use_case.js';
import type { TournamentSlotHoldLifecycleRepository } from './respond_tournament_slot.use_case.js';

/**
 * El organizador cierra el horario de un partido sin esperar a los jugadores.
 *
 * En americano y en cualquier formato que juega una ronda entera a la vez, el
 * organizador es quien lleva el proceso: esperar cuatro respuestas por partido
 * para confirmar una cancha que el club ya tiene asignada no le sirve a nadie.
 *
 * No reemplaza a la aceptacion de los jugadores: convive con ella. El jugador
 * sigue pudiendo avisar que no puede, y ahi el organizador reubica.
 */
export class SettleTournamentSlotAsOrganizerUseCase {
  constructor(
    private readonly _tournamentRepository: TournamentRepository,
    private readonly _scheduleRepository: TournamentScheduleRepository,
    private readonly _assertOrganizerAccess: AssertTournamentOrganizerAccessUseCase,
    private readonly _holdRepository: TournamentSlotHoldLifecycleRepository,
  ) {}

  async executeSV(_input: {
    tournamentId: string;
    roundNumber: number;
    matchNumber: number;
    actorUserId: string;
    decision: 'CONFIRM' | 'RELEASE';
  }): Promise<{ applied: boolean }> {
    const TOURNAMENT = await this._tournamentRepository.findByIdSV(_input.tournamentId);
    if (TOURNAMENT === null) {
      throw new AppError('TORNEO_NO_ENCONTRADO', 'El torneo indicado no existe.', 404);
    }

    await this._assertOrganizerAccess.executeSV({
      actorUserId: _input.actorUserId,
      organizerUserId: TOURNAMENT.organizerUserId,
      venueId: TOURNAMENT.venueId,
    });

    const SCHEDULE = await this._scheduleRepository.findByTournamentIdSV(_input.tournamentId);
    const SLOT = (SCHEDULE?.slotPlan ?? []).find(
      (_s) => _s.roundNumber === _input.roundNumber && _s.matchNumber === _input.matchNumber,
    );
    if (SLOT === undefined) {
      throw new AppError(
        'TURNO_NO_ENCONTRADO',
        'Ese partido no tiene una cancha apartada.',
        404,
      );
    }

    const HOLD = { courtId: SLOT.courtId, scheduledAt: SLOT.scheduledAt };

    //? `applied: false` cuando el turno ya no estaba apartado: alguien lo
    //? confirmo o vencio antes. No es un error, es que no habia nada que hacer.
    const APPLIED =
      _input.decision === 'CONFIRM'
        ? await this._holdRepository.confirmHoldSV(HOLD)
        : await this._holdRepository.releaseHoldSV(HOLD);

    return { applied: APPLIED };
  }
}

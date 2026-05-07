import { AppError } from '../../domain/errors/app_error.js';
import type { MatchCourtAvailabilityRepository } from '../../domain/ports/match_court_availability_repository.js';

export type AssertMatchCourtSlotAvailableInput = {
  venueId?: string;
  courtId: string;
  scheduledAt: Date;
  sportId: string;
  categoryId: string;
  durationMinutes?: number;
  excludeMatchId?: string;
};

export async function assertMatchCourtSlotAvailableSV(
  _repo: MatchCourtAvailabilityRepository,
  _input: AssertMatchCourtSlotAvailableInput,
): Promise<void> {
  const DURATION = _input.durationMinutes ?? 90;
  if (DURATION < 1 || DURATION > 24 * 60) {
    throw new AppError(
      'VALIDACION_FALLIDA',
      'durationMinutes debe estar entre 1 y 1440.',
      400,
    );
  }

  if (_input.venueId !== undefined) {
    const VENUE_OF_COURT = await _repo.getCourtVenueIdSV(_input.courtId);
    if (VENUE_OF_COURT === null) {
      throw new AppError('CANCHA_NO_ENCONTRADA', 'La cancha indicada no existe.', 404);
    }
    if (VENUE_OF_COURT !== _input.venueId) {
      throw new AppError(
        'CANCHA_NO_EN_SEDE',
        'La cancha no pertenece a la sede seleccionada.',
        400,
      );
    }
  }

  const VACANT = await _repo.findPublishedVacantAtCourtScheduledAtSV(
    _input.courtId,
    _input.scheduledAt,
  );
  if (VACANT !== null) {
    if (VACANT.sportId !== _input.sportId || VACANT.categoryId !== _input.categoryId) {
      throw new AppError(
        'HORARIO_RESERVA_INCOMPATIBLE',
        'El horario publicado en esta cancha no coincide con el deporte o la categoría.',
        409,
      );
    }
  }

  const CONFLICT_ID = await _repo.findConflictingActiveMatchIdSV({
    courtId: _input.courtId,
    scheduledAt: _input.scheduledAt,
    durationMinutes: DURATION,
    ...(_input.excludeMatchId !== undefined ? { excludeMatchId: _input.excludeMatchId } : {}),
  });
  if (CONFLICT_ID !== null) {
    throw new AppError('CANCHA_OCUPADA', 'La cancha ya tiene un partido en ese horario.', 409, {
      conflictingMatchId: CONFLICT_ID,
    });
  }
}

import { AppError } from '../../domain/errors/app_error.js';
import type { MatchCourtAvailabilityRepository } from '../../domain/ports/match_court_availability_repository.js';

export type CourtAvailabilityReasonDTO =
  | 'OCCUPIED_MATCH'
  | 'INCOMPATIBLE_VACANT_HOUR'
  | 'OUT_OF_RANGE';

export type CourtAvailabilitySlotDTO = {
  scheduledAt: string;
  isAvailable: boolean;
  reason?: CourtAvailabilityReasonDTO;
};

export type CourtAvailabilityCourtDTO = {
  court: { id: string; name: string; venueId: string };
  slots: CourtAvailabilitySlotDTO[];
};

export type GetCourtAvailabilityUseCaseInput = {
  venueId: string;
  courtId?: string;
  from: Date;
  to: Date;
  durationMinutes?: number;
  stepMinutes?: number;
  sportId?: string;
  categoryId?: string;
};

export type GetCourtAvailabilityUseCaseOutput = {
  venueId: string;
  from: string;
  to: string;
  durationMinutes: number;
  stepMinutes: number;
  courts: CourtAvailabilityCourtDTO[];
};

function addMinutesSV(_date: Date, _minutes: number): Date {
  return new Date(_date.getTime() + _minutes * 60_000);
}

export class GetCourtAvailabilityUseCase {
  constructor(private readonly _repo: MatchCourtAvailabilityRepository) {}

  async executeSV(_input: GetCourtAvailabilityUseCaseInput): Promise<GetCourtAvailabilityUseCaseOutput> {
    const DURATION = _input.durationMinutes ?? 90;
    const STEP = _input.stepMinutes ?? 30;

    if (DURATION < 1 || DURATION > 24 * 60) {
      throw new AppError('VALIDACION_FALLIDA', 'durationMinutes debe estar entre 1 y 1440.', 400);
    }
    if (STEP < 1 || STEP > 24 * 60) {
      throw new AppError('VALIDACION_FALLIDA', 'stepMinutes debe estar entre 1 y 1440.', 400);
    }
    if (!(_input.from.getTime() < _input.to.getTime())) {
      throw new AppError('VALIDACION_FALLIDA', 'from debe ser menor que to.', 400);
    }

    const HAS_SPORT = _input.sportId !== undefined;
    const HAS_CATEGORY = _input.categoryId !== undefined;
    if (HAS_SPORT !== HAS_CATEGORY) {
      throw new AppError('VALIDACION_FALLIDA', 'sportId y categoryId deben enviarse juntos.', 400);
    }

    const ALL_COURTS = await this._repo.listVenueCourtsSV(_input.venueId);
    const COURTS =
      _input.courtId === undefined ? ALL_COURTS : ALL_COURTS.filter((_c) => _c.id === _input.courtId);

    if (_input.courtId !== undefined && COURTS.length === 0) {
      throw new AppError('CANCHA_NO_EN_SEDE', 'La cancha no pertenece a la sede seleccionada.', 400);
    }

    const RESULT_COURTS: CourtAvailabilityCourtDTO[] = [];
    for (const C of COURTS) {
      const SLOTS: CourtAvailabilitySlotDTO[] = [];
      for (let t = new Date(_input.from); t.getTime() < _input.to.getTime(); t = addMinutesSV(t, STEP)) {
        const SLOT_END = addMinutesSV(t, DURATION);
        if (SLOT_END.getTime() > _input.to.getTime()) {
          SLOTS.push({
            scheduledAt: t.toISOString(),
            isAvailable: false,
            reason: 'OUT_OF_RANGE',
          });
          continue;
        }

        if (_input.sportId !== undefined && _input.categoryId !== undefined) {
          const VACANT = await this._repo.findPublishedVacantAtCourtScheduledAtSV(C.id, t);
          if (VACANT !== null) {
            if (VACANT.sportId !== _input.sportId || VACANT.categoryId !== _input.categoryId) {
              SLOTS.push({
                scheduledAt: t.toISOString(),
                isAvailable: false,
                reason: 'INCOMPATIBLE_VACANT_HOUR',
              });
              continue;
            }
          }
        }

        const CONFLICT_ID = await this._repo.findConflictingActiveMatchIdSV({
          courtId: C.id,
          scheduledAt: t,
          durationMinutes: DURATION,
        });
        if (CONFLICT_ID !== null) {
          SLOTS.push({
            scheduledAt: t.toISOString(),
            isAvailable: false,
            reason: 'OCCUPIED_MATCH',
          });
          continue;
        }

        SLOTS.push({
          scheduledAt: t.toISOString(),
          isAvailable: true,
        });
      }

      RESULT_COURTS.push({
        court: { id: C.id, name: C.name, venueId: C.venueId },
        slots: SLOTS,
      });
    }

    return {
      venueId: _input.venueId,
      from: _input.from.toISOString(),
      to: _input.to.toISOString(),
      durationMinutes: DURATION,
      stepMinutes: STEP,
      courts: RESULT_COURTS,
    };
  }
}


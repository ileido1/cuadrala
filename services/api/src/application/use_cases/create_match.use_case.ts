import { AppError } from '../../domain/errors/app_error.js';
import type { MatchCourtAvailabilityRepository } from '../../domain/ports/match_court_availability_repository.js';
import type { MatchCrudRepository } from '../../domain/ports/match_crud_repository.js';
import type { CreateMatchInputDTO, MatchDetailDTO } from '../../domain/ports/match_crud_repository.js';
import type { UserCategoryRepository } from '../../domain/ports/user_category_repository.js';
import { assertMatchCourtSlotAvailableSV } from '../services/assert_match_court_slot_available.js';

export type CreateMatchUseCaseInput = {
  creatorUserId: string;
  sportId: string;
  categoryId: string;
  type?: 'AMERICANO' | 'REGULAR';
  scheduledAt?: Date;
  courtId?: string;
  venueId?: string;
  durationMinutes?: number;
  tournamentId?: string;
  maxParticipants?: number;
  pricePerPlayerCents?: number;
  notes?: string;
};

export class CreateMatchUseCase {
  constructor(
    private readonly _matchCrudRepository: MatchCrudRepository,
    private readonly _matchCourtAvailabilityRepository: MatchCourtAvailabilityRepository,
    private readonly _userCategoryRepository: UserCategoryRepository,
  ) {}

  async executeSV(_input: CreateMatchUseCaseInput): Promise<MatchDetailDTO> {
    const HAS_CATEGORY = await this._userCategoryRepository.userHasCategoryForSportSV(
      _input.creatorUserId,
      _input.sportId,
      _input.categoryId,
    );
    if (!HAS_CATEGORY) {
      throw new AppError(
        'CATEGORIA_NO_COMPATIBLE',
        'La categoría debe coincidir con tu perfil para este deporte.',
        403,
      );
    }

    const MAX_PARTICIPANTS = _input.maxParticipants ?? 4;
    if (MAX_PARTICIPANTS < 2 || MAX_PARTICIPANTS > 100) {
      throw new AppError('VALIDACION_FALLIDA', 'maxParticipants debe estar entre 2 y 100.', 400);
    }

    const HAS_COURT = _input.courtId !== undefined;
    if (
      HAS_COURT &&
      _input.courtId !== undefined &&
      _input.scheduledAt !== undefined &&
      _input.venueId !== undefined
    ) {
      const DURATION_MINUTES = _input.durationMinutes ?? 90;
      await assertMatchCourtSlotAvailableSV(this._matchCourtAvailabilityRepository, {
        venueId: _input.venueId,
        courtId: _input.courtId,
        scheduledAt: _input.scheduledAt,
        sportId: _input.sportId,
        categoryId: _input.categoryId,
        durationMinutes: DURATION_MINUTES,
      });

      const HAS_RESERVATION =
        await this._matchCourtAvailabilityRepository.hasConfirmedReservationAtCourtScheduledAtSV(
          _input.courtId,
          _input.scheduledAt,
        );
      if (HAS_RESERVATION) {
        throw new AppError(
          'CONFLICTO',
          'Ya existe una reserva confirmada para ese horario en esta cancha.',
          409,
        );
      }
    }

    const CREATE_INPUT: CreateMatchInputDTO = {
      sportId: _input.sportId,
      categoryId: _input.categoryId,
      type: _input.type ?? 'REGULAR',
      maxParticipants: MAX_PARTICIPANTS,
      ...(_input.pricePerPlayerCents !== undefined ? { pricePerPlayerCents: _input.pricePerPlayerCents } : {}),
      ...(_input.scheduledAt !== undefined ? { scheduledAt: _input.scheduledAt } : {}),
      ...(_input.courtId !== undefined ? { courtId: _input.courtId } : {}),
      ...(_input.venueId !== undefined ? { venueId: _input.venueId } : {}),
      ...(_input.durationMinutes !== undefined ? { durationMinutes: _input.durationMinutes } : {}),
      ...(_input.tournamentId !== undefined ? { tournamentId: _input.tournamentId } : {}),
      ...(_input.notes !== undefined ? { notes: _input.notes } : {}),
    };

    return this._matchCrudRepository.createMatchSV(CREATE_INPUT, _input.creatorUserId);
  }
}


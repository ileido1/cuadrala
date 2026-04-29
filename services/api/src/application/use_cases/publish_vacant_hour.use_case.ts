import { AppError } from '../../domain/errors/app_error.js';
import type { UserRepository } from '../../domain/ports/user_repository.js';
import type { SystemMatchRepository } from '../../domain/ports/system_match_repository.js';
import type { VacantHourDTO, VacantHourRepository } from '../../domain/ports/vacant_hour_repository.js';

export type PublishVacantHourUseCaseInput = {
  venueId: string;
  courtId: string;
  sportId: string;
  categoryId: string;
  scheduledAt: Date;
  durationMinutes?: number;
  pricePerPlayerCents?: number;
  maxParticipants?: number;
};

export type PublishVacantHourUseCaseOutput = {
  vacantHour: VacantHourDTO;
  matchId: string;
};

const SYSTEM_ORGANIZER_EMAIL_LOWER = 'system@cuadrala.internal';

export class PublishVacantHourUseCase {
  constructor(
    private readonly _vacantHourRepository: VacantHourRepository,
    private readonly _systemMatchRepository: SystemMatchRepository,
    private readonly _userRepository: UserRepository,
  ) {}

  async executeSV(_input: PublishVacantHourUseCaseInput): Promise<PublishVacantHourUseCaseOutput> {
    const MAX_PARTICIPANTS = _input.maxParticipants ?? 4;
    if (MAX_PARTICIPANTS < 2 || MAX_PARTICIPANTS > 100) {
      throw new AppError('VALIDACION_FALLIDA', 'maxParticipants debe estar entre 2 y 100.', 400);
    }

    if (_input.durationMinutes !== undefined && _input.durationMinutes <= 0) {
      throw new AppError('VALIDACION_FALLIDA', 'durationMinutes debe ser mayor a 0.', 400);
    }

    const EXISTING = await this._vacantHourRepository.findByCourtAndScheduledAtSV(_input.courtId, _input.scheduledAt);
    if (EXISTING !== null && EXISTING.status === 'PUBLISHED') {
      throw new AppError('CONFLICTO', 'Ya existe una vacante publicada para ese horario.', 409);
    }

    const ORGANIZER_USER_ID = await this.ensureSystemOrganizerUserIdSV();

    const MATCH = await this._systemMatchRepository.createScheduledMatchSV({
      organizerUserId: ORGANIZER_USER_ID,
      sportId: _input.sportId,
      categoryId: _input.categoryId,
      type: 'REGULAR',
      scheduledAt: _input.scheduledAt,
      courtId: _input.courtId,
      maxParticipants: MAX_PARTICIPANTS,
      ...(_input.pricePerPlayerCents !== undefined ? { pricePerPlayerCents: _input.pricePerPlayerCents } : {}),
    });

    const VACANT_HOUR = await this._vacantHourRepository.createVacantHourSV({
      venueId: _input.venueId,
      courtId: _input.courtId,
      sportId: _input.sportId,
      categoryId: _input.categoryId,
      scheduledAt: _input.scheduledAt,
      ...( _input.durationMinutes !== undefined ? { durationMinutes: _input.durationMinutes } : {}),
      ...(_input.pricePerPlayerCents !== undefined ? { pricePerPlayerCents: _input.pricePerPlayerCents } : {}),
      maxParticipants: MAX_PARTICIPANTS,
      matchId: MATCH.id,
    });

    return { vacantHour: VACANT_HOUR, matchId: MATCH.id };
  }

  private async ensureSystemOrganizerUserIdSV(): Promise<string> {
    const EXISTING = await this._userRepository.findByEmailSV(SYSTEM_ORGANIZER_EMAIL_LOWER);
    if (EXISTING !== null) return EXISTING.id;

    const CREATED = await this._userRepository.createUserSV({
      emailLower: SYSTEM_ORGANIZER_EMAIL_LOWER,
      name: 'Sistema',
      passwordHash: 'system-user-not-for-login',
    });

    return CREATED.id;
  }
}


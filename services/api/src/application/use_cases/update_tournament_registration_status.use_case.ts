import { AppError } from '../../domain/errors/app_error.js';
import type {
  TournamentRegistrationDTO,
  TournamentRegistrationRepository,
} from '../../domain/ports/tournament_registration_repository.js';
import type { TournamentRepository } from '../../domain/ports/tournament_repository.js';
import type { AssertTournamentOrganizerAccessUseCase } from './assert_tournament_organizer_access.use_case.js';

export class UpdateTournamentRegistrationStatusUseCase {
  constructor(
    private readonly _tournamentRepository: TournamentRepository,
    private readonly _registrationRepository: TournamentRegistrationRepository,
    private readonly _assertTournamentOrganizerAccess: AssertTournamentOrganizerAccessUseCase,
  ) {}

  async executeSV(_input: {
    tournamentId: string;
    registrationId: string;
    status: 'CONFIRMED';
    actorUserId: string;
  }): Promise<TournamentRegistrationDTO> {
    //? 1. Cargar el torneo y validar que exista
    const TOURNAMENT = await this._tournamentRepository.findByIdSV(_input.tournamentId);
    if (TOURNAMENT === null) {
      throw new AppError('TORNEO_NO_ENCONTRADO', 'El torneo indicado no existe.', 404);
    }

    //? 2. Solo el organizador puede confirmar inscripciones (403 si no)
    await this._assertTournamentOrganizerAccess.executeSV({
      actorUserId: _input.actorUserId,
      organizerUserId: TOURNAMENT.organizerUserId,
      venueId: TOURNAMENT.venueId,
    });

    //? 3. El roster se bloquea desde IN_PROGRESS; confirmar solo mientras DRAFT/OPEN
    if (TOURNAMENT.status !== 'DRAFT' && TOURNAMENT.status !== 'OPEN') {
      throw new AppError(
        'TORNEO_CERRADO',
        'El torneo no admite cambios de inscripción en su estado actual.',
        409,
      );
    }

    //? 4. Cargar la inscripción y validar que exista y pertenezca al torneo
    const REGISTRATION = await this._registrationRepository.findByIdSV(_input.registrationId);
    if (REGISTRATION === null || REGISTRATION.tournamentId !== _input.tournamentId) {
      throw new AppError('INSCRIPCION_NO_ENCONTRADA', 'La inscripción indicada no existe.', 404);
    }

    //? 5. Actualizar el status
    const UPDATED = await this._registrationRepository.updateStatusByIdSV(
      _input.registrationId,
      _input.status,
    );
    if (UPDATED === null) {
      throw new AppError('INSCRIPCION_NO_ENCONTRADA', 'La inscripción indicada no existe.', 404);
    }
    return UPDATED;
  }
}

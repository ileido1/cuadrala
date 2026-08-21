import { AppError } from '../../domain/errors/app_error.js';
import type { TournamentRegistrationRepository } from '../../domain/ports/tournament_registration_repository.js';
import type { TournamentRepository } from '../../domain/ports/tournament_repository.js';
import type { AssertTournamentOrganizerAccessUseCase } from './assert_tournament_organizer_access.use_case.js';

export class RemoveTournamentRegistrationUseCase {
  constructor(
    private readonly _tournamentRepository: TournamentRepository,
    private readonly _registrationRepository: TournamentRegistrationRepository,
    private readonly _assertTournamentOrganizerAccess: AssertTournamentOrganizerAccessUseCase,
  ) {}

  async executeSV(_input: {
    tournamentId: string;
    registrationId: string;
    actorUserId: string;
  }): Promise<void> {
    //? 1. Cargar el torneo y validar que exista
    const TOURNAMENT = await this._tournamentRepository.findByIdSV(_input.tournamentId);
    if (TOURNAMENT === null) {
      throw new AppError('TORNEO_NO_ENCONTRADO', 'El torneo indicado no existe.', 404);
    }

    //? 2. Solo el organizador puede eliminar inscripciones (403 si no)
    await this._assertTournamentOrganizerAccess.executeSV({
      actorUserId: _input.actorUserId,
      organizerUserId: TOURNAMENT.organizerUserId,
      venueId: TOURNAMENT.venueId,
    });

    //? 3. Cargar la inscripción y validar que exista y pertenezca al torneo
    const REGISTRATION = await this._registrationRepository.findByIdSV(_input.registrationId);
    if (REGISTRATION === null || REGISTRATION.tournamentId !== _input.tournamentId) {
      throw new AppError('INSCRIPCION_NO_ENCONTRADA', 'La inscripción indicada no existe.', 404);
    }

    //? 4. El roster se bloquea desde IN_PROGRESS; eliminar solo mientras DRAFT/OPEN
    if (TOURNAMENT.status !== 'DRAFT' && TOURNAMENT.status !== 'OPEN') {
      throw new AppError(
        'TORNEO_CERRADO',
        'El torneo no admite eliminar inscripciones en su estado actual.',
        409,
      );
    }

    //? 5. Eliminar (cascada elimina MatchParticipant de invitados, Prisma onDelete: Cascade)
    await this._registrationRepository.deleteByIdSV(_input.registrationId);
  }
}

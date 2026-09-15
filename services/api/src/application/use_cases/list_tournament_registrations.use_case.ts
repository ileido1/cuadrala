import { AppError } from '../../domain/errors/app_error.js';
import type { TournamentRegistrationDTO, TournamentRegistrationRepository } from '../../domain/ports/tournament_registration_repository.js';
import type { TournamentRepository } from '../../domain/ports/tournament_repository.js';
import type { AssertTournamentOrganizerAccessUseCase } from './assert_tournament_organizer_access.use_case.js';

export class ListTournamentRegistrationsUseCase {
  constructor(
    private readonly _tournamentRepository: TournamentRepository,
    private readonly _registrationRepository: TournamentRegistrationRepository,
    private readonly _assertTournamentOrganizerAccess: AssertTournamentOrganizerAccessUseCase,
  ) {}

  async executeSV(_input: {
    tournamentId: string;
    actorUserId: string;
  }): Promise<{ items: TournamentRegistrationDTO[]; total: number }> {
    //? 1. Validar que el torneo exista
    const TOURNAMENT = await this._tournamentRepository.findByIdSV(_input.tournamentId);
    if (TOURNAMENT === null) {
      throw new AppError('TORNEO_NO_ENCONTRADO', 'El torneo indicado no existe.', 404);
    }

    //? 2. Traer inscripciones y total, sin filtrar por autoridad
    const ITEMS = await this._registrationRepository.listByTournamentIdSV(_input.tournamentId);
    const TOTAL = await this._registrationRepository.countByTournamentIdSV(_input.tournamentId);

    //? 3. Quien no organiza el torneo no ve el contacto de los invitados
    const HAS_ORGANIZER_ACCESS = await this._assertTournamentOrganizerAccess.hasAccessSV({
      actorUserId: _input.actorUserId,
      organizerUserId: TOURNAMENT.organizerUserId,
      venueId: TOURNAMENT.venueId,
    });
    const REDACTED_ITEMS = HAS_ORGANIZER_ACCESS
      ? ITEMS
      : ITEMS.map((_item) => ({ ..._item, guestPhone: null, guestEmail: null }));

    return { items: REDACTED_ITEMS, total: TOTAL };
  }
}

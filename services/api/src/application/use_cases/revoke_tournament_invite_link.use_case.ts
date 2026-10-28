import { AppError } from '../../domain/errors/app_error.js';
import type { TournamentInviteLinkRepository } from '../../domain/ports/tournament_invite_link_repository.js';
import type { TournamentRepository } from '../../domain/ports/tournament_repository.js';
import type { AssertTournamentOrganizerAccessUseCase } from './assert_tournament_organizer_access.use_case.js';

export class RevokeTournamentInviteLinkUseCase {
  constructor(
    private readonly _tournamentRepository: TournamentRepository,
    private readonly _inviteLinkRepository: TournamentInviteLinkRepository,
    private readonly _assertTournamentOrganizerAccess: AssertTournamentOrganizerAccessUseCase,
  ) {}

  async executeSV(_input: {
    tournamentId: string;
    linkId: string;
    actorUserId: string;
  }): Promise<void> {
    //? 1. Si el torneo no existe, 404 ENLACE_NO_ENCONTRADO (no TORNEO_NO_ENCONTRADO):
    //?    "no se filtra existencia cruzada" aplica también a este caso límite
    //?    (design.md, "Puntos resueltos" #2).
    const TOURNAMENT = await this._tournamentRepository.findByIdSV(_input.tournamentId);
    if (TOURNAMENT === null) {
      throw new AppError('ENLACE_NO_ENCONTRADO', 'El enlace de invitación no existe.', 404);
    }

    //? 2. Solo el organizador o staff de su sede puede revocar (REQ-TIL-005)
    await this._assertTournamentOrganizerAccess.executeSV({
      actorUserId: _input.actorUserId,
      organizerUserId: TOURNAMENT.organizerUserId,
      venueId: TOURNAMENT.venueId,
    });

    //? 3. Buscar el link acotado al torneo: si pertenece a otro torneo, el
    //?    lookup scoped devuelve null, sin revelar si el id existe en otro lado.
    const LINK = await this._inviteLinkRepository.findByIdAndTournamentIdSV(
      _input.linkId,
      TOURNAMENT.id,
    );
    if (LINK === null) {
      throw new AppError('ENLACE_NO_ENCONTRADO', 'El enlace de invitación no existe.', 404);
    }

    //? 4. Revocar: idempotente, revocar un link ya revocado no es error.
    await this._inviteLinkRepository.revokeSV(LINK.id);
  }
}

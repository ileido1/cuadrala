import { AppError } from '../../domain/errors/app_error.js';
import { assertTournamentInviteLinkUsableSV } from '../../domain/tournament/tournament_invite_link_validity.js';
import { isTournamentRosterOpenSV } from '../../domain/tournament/tournament_registration_window.js';
import type { TournamentInviteLinkRepository } from '../../domain/ports/tournament_invite_link_repository.js';
import type { TournamentRepository } from '../../domain/ports/tournament_repository.js';
import type { SportRepository } from '../../domain/ports/sport_repository.js';
import type { CategoryRepository } from '../../domain/ports/category_repository.js';
import type { VenueRepository } from '../../domain/ports/venue_repository.js';

export class GetTournamentInviteLinkPreviewUseCase {
  constructor(
    private readonly _inviteLinkRepository: TournamentInviteLinkRepository,
    private readonly _tournamentRepository: TournamentRepository,
    private readonly _sportRepository: SportRepository,
    private readonly _categoryRepository: CategoryRepository,
    private readonly _venueRepository: VenueRepository,
  ) {}

  async executeSV(_token: string): Promise<{
    tournamentId: string;
    tournamentName: string;
    sportName: string;
    categoryName: string;
    venueName: string | null;
    startsAt: Date | null;
    status: string;
    acceptsRegistration: boolean;
  }> {
    //? 1. Buscar por hash del token crudo (NFR-TIL-001): sin match, fail-closed
    //?    con el mismo código que un link inválido (no se revela si el token existe).
    const LINK = await this._inviteLinkRepository.findByTokenHashSV(_token);
    if (LINK === null) {
      throw new AppError('ENLACE_INVALIDO', 'El enlace de invitación no es válido.', 410);
    }

    //? 2. Expirado / revocado / agotado (REQ-TIL-003/004/005)
    assertTournamentInviteLinkUsableSV(LINK);

    //? 3. Cargar el torneo detrás del link
    const TOURNAMENT = await this._tournamentRepository.findByIdSV(LINK.tournamentId);
    if (TOURNAMENT === null) {
      throw new AppError('TORNEO_NO_ENCONTRADO', 'El torneo indicado no existe.', 404);
    }

    //? 4. Resolver deporte/categoría/sede en paralelo: son independientes entre sí
    const [SPORT, CATEGORY, VENUE] = await Promise.all([
      this._sportRepository.findByIdSV(TOURNAMENT.sportId),
      this._categoryRepository.findByIdSV(TOURNAMENT.categoryId),
      TOURNAMENT.venueId !== null
        ? this._venueRepository.findByIdSV(TOURNAMENT.venueId)
        : Promise.resolve(null),
    ]);

    //? 5. acceptsRegistration es informativo: nunca lanza (REQ-TIL-012, previsualización
    //?    debe mostrar el motivo específico en la landing, no fallar al previsualizar).
    return {
      tournamentId: TOURNAMENT.id,
      tournamentName: TOURNAMENT.name,
      sportName: SPORT?.name ?? '',
      categoryName: CATEGORY?.name ?? '',
      venueName: VENUE?.name ?? null,
      startsAt: TOURNAMENT.startsAt,
      status: TOURNAMENT.status,
      acceptsRegistration: isTournamentRosterOpenSV(TOURNAMENT.status),
    };
  }
}

import { AppError } from '../../domain/errors/app_error.js';
import type { TournamentRegistrationDTO, TournamentRegistrationRepository } from '../../domain/ports/tournament_registration_repository.js';
import type { TournamentRepository } from '../../domain/ports/tournament_repository.js';
import type { UserCategoryRepository } from '../../domain/ports/user_category_repository.js';
import type { AssertTournamentOrganizerAccessUseCase } from './assert_tournament_organizer_access.use_case.js';

export class ListTournamentRegistrationsUseCase {
  constructor(
    private readonly _tournamentRepository: TournamentRepository,
    private readonly _registrationRepository: TournamentRegistrationRepository,
    private readonly _assertTournamentOrganizerAccess: AssertTournamentOrganizerAccessUseCase,
    private readonly _userCategoryRepository: UserCategoryRepository,
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
    if (!HAS_ORGANIZER_ACCESS) {
      return {
        items: ITEMS.map((_item) => ({
          ..._item,
          guestPhone: null,
          guestEmail: null,
        })),
        total: TOTAL,
      };
    }

    const USER_IDS = [...new Set(ITEMS.flatMap((_item) => (_item.userId ? [_item.userId] : [])))];
    const CATEGORIES = await Promise.all(
      USER_IDS.map(async (_userId) => ({
        userId: _userId,
        categories: await this._userCategoryRepository.listByUserIdSV(_userId),
      })),
    );
    const CATEGORY_BY_USER = new Map(
      CATEGORIES.map(({ userId, categories }) => [
        userId,
        categories.find((_category) => _category.sportId === TOURNAMENT.sportId)?.categoryName ?? null,
      ]),
    );
    const ORGANIZER_ITEMS = ITEMS.map((_item) => ({
      ..._item,
      sportCategoryName: _item.userId ? CATEGORY_BY_USER.get(_item.userId) ?? null : null,
    }));

    return { items: ORGANIZER_ITEMS, total: TOTAL };
  }
}

import { enrichPlayerSportProfilesSV } from '../helpers/enrich_player_sport_profiles.js';
import { AppError } from '../../domain/errors/app_error.js';
import {
  isRacketSportCodeSV,
  isTeamSportCodeSV,
  skillLevelFromRacketSlugSV,
  skillLevelFromTeamTierSlugSV,
} from '../../domain/services/category/sport_classification_catalog.js';
import type { CategoryRepository } from '../../domain/ports/category_repository.js';
import type {
  PlayerSportProfileDTO,
  PlayerSportProfileRepository,
  UpsertPlayerSportProfileDTO,
} from '../../domain/ports/player_sport_profile_repository.js';
import type { SportRepository } from '../../domain/ports/sport_repository.js';
import type { UserCategoryRepository } from '../../domain/ports/user_category_repository.js';

export class ReplaceMySportProfilesUseCase {
  public constructor(
    private readonly _repo: PlayerSportProfileRepository,
    private readonly _sportRepository: SportRepository,
    private readonly _categoryRepository: CategoryRepository,
    private readonly _userCategoryRepository: UserCategoryRepository,
  ) {}

  async executeSV(_userId: string, _items: UpsertPlayerSportProfileDTO[]): Promise<PlayerSportProfileDTO[]> {
    const SEEN = new Set<string>();
    const CATEGORY_ITEMS: Array<{ sportId: string; categoryId: string }> = [];
    const NORMALIZED: UpsertPlayerSportProfileDTO[] = [];

    for (const ITEM of _items) {
      if (SEEN.has(ITEM.sportId)) {
        throw new AppError('VALIDACION_FALLIDA', 'No se puede repetir el mismo deporte.', 400);
      }
      SEEN.add(ITEM.sportId);

      const SPORT = await this._sportRepository.findByIdSV(ITEM.sportId);
      if (SPORT === null) {
        throw new AppError('DEPORTE_NO_ENCONTRADO', 'El deporte indicado no existe.', 404);
      }

      let skillLevel = ITEM.skillLevel;
      let sidePreference = ITEM.sidePreference;

      if (ITEM.categoryId !== undefined && ITEM.categoryId !== '') {
        const CATEGORY = await this._categoryRepository.findByIdAndSportIdSV(
          ITEM.categoryId,
          ITEM.sportId,
        );
        if (CATEGORY === null) {
          throw new AppError(
            'CATEGORIA_NO_VALIDA',
            'La categoría no pertenece al deporte seleccionado.',
            400,
          );
        }

        if (isRacketSportCodeSV(SPORT.code)) {
          if (CATEGORY.scheme !== 'RACKET_ORDINAL') {
            throw new AppError(
              'CATEGORIA_NO_VALIDA',
              'Debes elegir una categoría ordinal (8va a 1ra) para este deporte.',
              400,
            );
          }
          if (sidePreference === undefined || sidePreference === 'ANY') {
            throw new AppError(
              'VALIDACION_FALLIDA',
              'Indica tu lado preferido (drive o revés) para deportes de raqueta.',
              400,
            );
          }
          skillLevel = skillLevelFromRacketSlugSV(CATEGORY.slug);
        } else if (isTeamSportCodeSV(SPORT.code)) {
          if (CATEGORY.scheme !== 'TEAM_SKILL') {
            throw new AppError(
              'CATEGORIA_NO_VALIDA',
              'Debes elegir Recreativo, Intermedio o Competitivo.',
              400,
            );
          }
          skillLevel = skillLevelFromTeamTierSlugSV(CATEGORY.slug);
          sidePreference = sidePreference ?? 'ANY';
        }

        CATEGORY_ITEMS.push({ sportId: ITEM.sportId, categoryId: ITEM.categoryId });
      } else if (isRacketSportCodeSV(SPORT.code) || isTeamSportCodeSV(SPORT.code)) {
        throw new AppError(
          'CATEGORIA_REQUERIDA',
          'Debes seleccionar tu categoría o nivel para cada deporte.',
          400,
        );
      }

      if (skillLevel < 1.0 || skillLevel > 7.0) {
        throw new AppError('VALIDACION_FALLIDA', 'skillLevel debe estar entre 1.0 y 7.0.', 400);
      }

      NORMALIZED.push({
        sportId: ITEM.sportId,
        skillLevel,
        ...(sidePreference !== undefined ? { sidePreference } : {}),
      });
    }

    const PROFILES = await this._repo.replaceForUserSV(_userId, NORMALIZED);

    if (CATEGORY_ITEMS.length > 0) {
      await this._userCategoryRepository.replaceForUserSV(_userId, CATEGORY_ITEMS);
    }

    const CATEGORIES = await this._userCategoryRepository.listByUserIdSV(_userId);
    return enrichPlayerSportProfilesSV(PROFILES, CATEGORIES);
  }
}

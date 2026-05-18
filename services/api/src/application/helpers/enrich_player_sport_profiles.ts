import type { PlayerSportProfileDTO } from '../../domain/ports/player_sport_profile_repository.js';
import type { UserSportCategoryDTO } from '../../domain/ports/user_category_repository.js';

/** Une perfiles deportivos con la categoría activa por deporte (UserSportCategory). */
export function enrichPlayerSportProfilesSV(
  _profiles: PlayerSportProfileDTO[],
  _categories: UserSportCategoryDTO[],
): PlayerSportProfileDTO[] {
  const BY_SPORT = new Map(_categories.map((_c) => [_c.sportId, _c]));
  return _profiles.map((_profile) => {
    const CAT = BY_SPORT.get(_profile.sportId);
    if (CAT === undefined) {
      return _profile;
    }
    return {
      ..._profile,
      categoryId: CAT.categoryId,
      categoryName: CAT.categoryName,
      categorySlug: CAT.categorySlug,
    };
  });
}

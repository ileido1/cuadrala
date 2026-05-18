export type UserSportCategoryDTO = {
  sportId: string;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
};

export interface UserCategoryRepository {
  listByUserIdSV(_userId: string): Promise<UserSportCategoryDTO[]>;
  userHasCategorySV(_userId: string, _categoryId: string): Promise<boolean>;
  userHasCategoryForSportSV(
    _userId: string,
    _sportId: string,
    _categoryId: string,
  ): Promise<boolean>;
  upsertForUserSportSV(
    _userId: string,
    _sportId: string,
    _categoryId: string,
  ): Promise<void>;
  replaceForUserSV(
    _userId: string,
    _items: Array<{ sportId: string; categoryId: string }>,
  ): Promise<void>;
}


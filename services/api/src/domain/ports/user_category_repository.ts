export interface UserCategoryRepository {
  userHasCategorySV(_userId: string, _categoryId: string): Promise<boolean>;
}


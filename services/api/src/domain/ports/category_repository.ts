export type CategoryDTO = {
  id: string;
  name: string;
  slug: string;
};

export interface CategoryRepository {
  findByIdSV(_id: string): Promise<CategoryDTO | null>;
}


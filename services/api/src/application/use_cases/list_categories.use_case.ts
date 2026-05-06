import type { CategoryDTO, CategoryRepository } from '../../domain/ports/category_repository.js';

export class ListCategoriesUseCase {
  public constructor(private readonly _categoryRepository: CategoryRepository) {}

  async executeSV(): Promise<CategoryDTO[]> {
    return this._categoryRepository.findAllSV();
  }
}

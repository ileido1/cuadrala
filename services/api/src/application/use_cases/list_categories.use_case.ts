import type { CategoryDTO, CategoryRepository } from '../../domain/ports/category_repository.js';

export class ListCategoriesUseCase {
  public constructor(private readonly _categoryRepository: CategoryRepository) {}

  async executeSV(_sportId?: string): Promise<CategoryDTO[]> {
    if (_sportId !== undefined && _sportId !== '') {
      return this._categoryRepository.findAllBySportIdSV(_sportId);
    }
    return this._categoryRepository.findAllSV();
  }
}

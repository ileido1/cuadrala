import type { CategoryDTO, CategoryRepository } from '../../domain/ports/category_repository.js';

import { PRISMA } from '../prisma_client.js';

export class PrismaCategoryRepository implements CategoryRepository {
  async findByIdSV(_id: string): Promise<CategoryDTO | null> {
    const ROW = await PRISMA.category.findUnique({ where: { id: _id } });
    return ROW === null ? null : { id: ROW.id, name: ROW.name, slug: ROW.slug };
  }
}


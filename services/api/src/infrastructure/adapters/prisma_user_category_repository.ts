import type { UserCategoryRepository } from '../../domain/ports/user_category_repository.js';

import { PRISMA } from '../prisma_client.js';

export class PrismaUserCategoryRepository implements UserCategoryRepository {
  async userHasCategorySV(_userId: string, _categoryId: string): Promise<boolean> {
    const ROW = await PRISMA.userCategory.findUnique({
      where: { userId_categoryId: { userId: _userId, categoryId: _categoryId } },
      select: { id: true },
    });
    return ROW !== null;
  }
}


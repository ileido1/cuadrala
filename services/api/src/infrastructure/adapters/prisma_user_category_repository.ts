import type {
  UserCategoryRepository,
  UserSportCategoryDTO,
} from '../../domain/ports/user_category_repository.js';

import { PRISMA } from '../prisma_client.js';

export class PrismaUserCategoryRepository implements UserCategoryRepository {
  async listByUserIdSV(_userId: string): Promise<UserSportCategoryDTO[]> {
    const ROWS = await PRISMA.userSportCategory.findMany({
      where: { userId: _userId },
      select: {
        sportId: true,
        categoryId: true,
        category: { select: { name: true, slug: true } },
      },
    });
    return ROWS.map((_row) => ({
      sportId: _row.sportId,
      categoryId: _row.categoryId,
      categoryName: _row.category.name,
      categorySlug: _row.category.slug,
    }));
  }

  async userHasCategorySV(_userId: string, _categoryId: string): Promise<boolean> {
    const ROW = await PRISMA.userCategory.findUnique({
      where: { userId_categoryId: { userId: _userId, categoryId: _categoryId } },
      select: { id: true },
    });
    if (ROW !== null) {
      return true;
    }
    const SPORT_ROW = await PRISMA.userSportCategory.findFirst({
      where: { userId: _userId, categoryId: _categoryId },
      select: { id: true },
    });
    return SPORT_ROW !== null;
  }

  async userHasCategoryForSportSV(
    _userId: string,
    _sportId: string,
    _categoryId: string,
  ): Promise<boolean> {
    const ROW = await PRISMA.userSportCategory.findUnique({
      where: { userId_sportId: { userId: _userId, sportId: _sportId } },
      select: { categoryId: true },
    });
    if (ROW === null) {
      return this.userHasCategorySV(_userId, _categoryId);
    }
    return ROW.categoryId === _categoryId;
  }

  async upsertForUserSportSV(
    _userId: string,
    _sportId: string,
    _categoryId: string,
  ): Promise<void> {
    await PRISMA.$transaction([
      PRISMA.userSportCategory.upsert({
        where: { userId_sportId: { userId: _userId, sportId: _sportId } },
        create: { userId: _userId, sportId: _sportId, categoryId: _categoryId },
        update: { categoryId: _categoryId },
      }),
      PRISMA.userCategory.upsert({
        where: {
          userId_categoryId: { userId: _userId, categoryId: _categoryId },
        },
        create: { userId: _userId, categoryId: _categoryId },
        update: {},
      }),
    ]);
  }

  async replaceForUserSV(
    _userId: string,
    _items: Array<{ sportId: string; categoryId: string }>,
  ): Promise<void> {
    await PRISMA.$transaction(async (_tx) => {
      await _tx.userSportCategory.deleteMany({ where: { userId: _userId } });
      for (const ITEM of _items) {
        await _tx.userSportCategory.create({
          data: {
            userId: _userId,
            sportId: ITEM.sportId,
            categoryId: ITEM.categoryId,
          },
        });
        await _tx.userCategory.upsert({
          where: {
            userId_categoryId: { userId: _userId, categoryId: ITEM.categoryId },
          },
          create: { userId: _userId, categoryId: ITEM.categoryId },
          update: {},
        });
      }
    });
  }
}

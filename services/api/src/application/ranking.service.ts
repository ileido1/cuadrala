import { AppError } from '../domain/errors/app_error.js';
import { findCategoryByIdRepo } from '../infrastructure/repositories/category.repository.js';
import {
  aggregateScoresByCategoryRepo,
  replaceRankingForCategoryRepo,
} from '../infrastructure/repositories/ranking.repository.js';

export async function recalculateRankingSV(_categoryId: string): Promise<{
  categoryId: string;
  entriesUpdated: number;
}> {
  const CATEGORY = await findCategoryByIdRepo(_categoryId);
  if (!CATEGORY) {
    throw new AppError('CATEGORIA_NO_ENCONTRADA', 'La categoría indicada no existe.', 404);
  }

  const AGG = await aggregateScoresByCategoryRepo(_categoryId);
  await replaceRankingForCategoryRepo(_categoryId, AGG);

  return {
    categoryId: _categoryId,
    entriesUpdated: AGG.length,
  };
}

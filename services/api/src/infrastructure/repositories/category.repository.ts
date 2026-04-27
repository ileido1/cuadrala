import type { Category } from '../../generated/prisma/client.js';

import { PRISMA } from '../prisma_client.js';

export async function findCategoryByIdRepo(_id: string): Promise<Category | null> {
  return PRISMA.category.findUnique({ where: { id: _id } });
}

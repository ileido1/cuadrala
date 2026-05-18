import type { Category } from '../../generated/prisma/client.js';

import { PRISMA } from '../../infrastructure/prisma_client.js';

/** Categoría de prueba vinculada a un deporte (post player-sport-classification). */
export async function createTestCategorySV(
  _sportId: string,
  _slug: string,
  _name?: string,
): Promise<Category> {
  return PRISMA.category.create({
    data: {
      sportId: _sportId,
      slug: _slug,
      name: _name ?? _slug,
      scheme: 'RACKET_ORDINAL',
      skillBand: 'INTERMEDIATE',
      sortOrder: 4,
    },
  });
}

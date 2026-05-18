import type { CategoryDTO, CategoryRepository } from '../../domain/ports/category_repository.js';

import { PRISMA } from '../prisma_client.js';

function mapRow(_r: {
  id: string;
  sportId: string;
  name: string;
  slug: string;
  scheme: string;
  skillBand: string | null;
  sortOrder: number;
}): CategoryDTO {
  return {
    id: _r.id,
    sportId: _r.sportId,
    name: _r.name,
    slug: _r.slug,
    scheme: _r.scheme as CategoryDTO['scheme'],
    skillBand: _r.skillBand as CategoryDTO['skillBand'],
    sortOrder: _r.sortOrder,
  };
}

export class PrismaCategoryRepository implements CategoryRepository {
  async findByIdSV(_id: string): Promise<CategoryDTO | null> {
    const ROW = await PRISMA.category.findUnique({ where: { id: _id } });
    return ROW === null ? null : mapRow(ROW);
  }

  async findAllSV(): Promise<CategoryDTO[]> {
    const ROWS = await PRISMA.category.findMany({
      orderBy: [{ sportId: 'asc' }, { sortOrder: 'desc' }],
    });
    return ROWS.map(mapRow);
  }

  async findAllBySportIdSV(_sportId: string): Promise<CategoryDTO[]> {
    const ROWS = await PRISMA.category.findMany({
      where: { sportId: _sportId },
      orderBy: { sortOrder: 'desc' },
    });
    return ROWS.map(mapRow);
  }

  async findByIdAndSportIdSV(_id: string, _sportId: string): Promise<CategoryDTO | null> {
    const ROW = await PRISMA.category.findFirst({
      where: { id: _id, sportId: _sportId },
    });
    return ROW === null ? null : mapRow(ROW);
  }
}

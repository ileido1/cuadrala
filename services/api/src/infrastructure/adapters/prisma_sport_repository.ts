import type { SportRepository } from '../../domain/ports/sport_repository.js';

import { PRISMA } from '../prisma_client.js';

export class PrismaSportRepository implements SportRepository {
  async listSportsSV() {
    return PRISMA.sport.findMany({
      orderBy: { code: 'asc' },
      select: { id: true, code: true, name: true },
    });
  }

  async findByIdSV(_id: string) {
    return PRISMA.sport.findUnique({
      where: { id: _id },
      select: { id: true, code: true, name: true },
    });
  }

  async findByCodeSV(_code: string) {
    return PRISMA.sport.findUnique({
      where: { code: _code },
      select: { id: true, code: true, name: true },
    });
  }
}


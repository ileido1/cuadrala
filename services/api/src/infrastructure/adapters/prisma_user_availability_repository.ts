import type {
  UserAvailabilityDTO,
  UserAvailabilityRepository,
} from '../../domain/ports/user_availability_repository.js';

import { PRISMA } from '../prisma_client.js';

export class PrismaUserAvailabilityRepository implements UserAvailabilityRepository {
  async listByUserIdSV(_userId: string): Promise<UserAvailabilityDTO[]> {
    const ROWS = await PRISMA.userAvailability.findMany({
      where: { userId: _userId },
      select: { dayOfWeek: true, slot: true },
    });
    return ROWS.map((_r) => ({ dayOfWeek: _r.dayOfWeek, slot: _r.slot }));
  }

  async replaceForUserSV(_userId: string, _items: UserAvailabilityDTO[]): Promise<UserAvailabilityDTO[]> {
    return PRISMA.$transaction(async (_tx) => {
      await _tx.userAvailability.deleteMany({ where: { userId: _userId } });
      if (_items.length > 0) {
        await _tx.userAvailability.createMany({
          data: _items.map((_i) => ({ userId: _userId, dayOfWeek: _i.dayOfWeek, slot: _i.slot })),
          skipDuplicates: true,
        });
      }
      const ROWS = await _tx.userAvailability.findMany({
        where: { userId: _userId },
        select: { dayOfWeek: true, slot: true },
      });
      return ROWS.map((_r) => ({ dayOfWeek: _r.dayOfWeek, slot: _r.slot }));
    });
  }
}

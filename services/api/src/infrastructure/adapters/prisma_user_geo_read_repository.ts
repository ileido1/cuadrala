import type { UserGeoDTO, UserGeoReadRepository } from '../../domain/ports/user_geo_read_repository.js';

import { PRISMA } from '../prisma_client.js';

export class PrismaUserGeoReadRepository implements UserGeoReadRepository {
  async getByUserIdsSV(_userIds: string[]): Promise<UserGeoDTO[]> {
    if (_userIds.length === 0) return [];

    const ROWS = await PRISMA.notificationSubscription.findMany({
      where: { enabled: true, userId: { in: _userIds } },
      orderBy: { createdAt: 'desc' },
      select: { userId: true, nearLat: true, nearLng: true },
    });

    const OUT = new Map<string, UserGeoDTO>();
    for (const _r of ROWS) {
      if (OUT.has(_r.userId)) continue;
      OUT.set(_r.userId, { userId: _r.userId, nearLat: _r.nearLat, nearLng: _r.nearLng });
    }
    return [...OUT.values()];
  }
}


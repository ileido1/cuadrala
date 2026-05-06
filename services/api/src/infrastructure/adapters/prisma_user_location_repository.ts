import type {
  UpsertUserLocationDTO,
  UserLocationDTO,
  UserLocationRepository,
} from '../../domain/ports/user_location_repository.js';

import { PRISMA } from '../prisma_client.js';

export class PrismaUserLocationRepository implements UserLocationRepository {
  async findByUserIdSV(_userId: string): Promise<UserLocationDTO | null> {
    const ROW = await PRISMA.userLocation.findUnique({
      where: { userId: _userId },
      select: { label: true, latitude: true, longitude: true, radiusKm: true },
    });
    if (ROW === null) return null;
    return {
      label: ROW.label,
      latitude: Number(ROW.latitude),
      longitude: Number(ROW.longitude),
      radiusKm: ROW.radiusKm,
    };
  }

  async upsertByUserIdSV(_userId: string, _patch: UpsertUserLocationDTO): Promise<UserLocationDTO> {
    const NOW = new Date();
    const ROW = await PRISMA.userLocation.upsert({
      where: { userId: _userId },
      create: {
        userId: _userId,
        label: _patch.label ?? null,
        latitude: _patch.latitude,
        longitude: _patch.longitude,
        radiusKm: _patch.radiusKm,
        updatedAt: NOW,
      },
      update: {
        ...(_patch.label !== undefined ? { label: _patch.label } : {}),
        latitude: _patch.latitude,
        longitude: _patch.longitude,
        radiusKm: _patch.radiusKm,
        updatedAt: NOW,
      },
      select: { label: true, latitude: true, longitude: true, radiusKm: true },
    });
    return {
      label: ROW.label,
      latitude: Number(ROW.latitude),
      longitude: Number(ROW.longitude),
      radiusKm: ROW.radiusKm,
    };
  }
}

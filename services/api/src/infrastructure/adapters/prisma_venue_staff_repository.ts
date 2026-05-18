import type { PrismaClient } from '../../generated/prisma/client.js';
import type { VenueStaffDTO, VenueStaffRepository, UpsertVenueStaffDTO } from '../../domain/ports/venue_staff_repository.js';

function mapRowSV(_row: {
  id: string;
  venueId: string;
  userId: string;
  role: string;
  createdAt: Date;
}): VenueStaffDTO {
  return {
    id: _row.id,
    venueId: _row.venueId,
    userId: _row.userId,
    role: _row.role,
    createdAt: _row.createdAt,
  };
}

export class PrismaVenueStaffRepository implements VenueStaffRepository {
  constructor(private readonly _prisma: PrismaClient) {}

  async upsertSV(_input: UpsertVenueStaffDTO): Promise<{ created: boolean; staff: VenueStaffDTO }> {
    const EXISTING = await this._prisma.venueStaff.findUnique({
      where: {
        venueId_userId: {
          venueId: _input.venueId,
          userId: _input.userId,
        },
      },
    });

    if (EXISTING !== null) {
      const UPDATED = await this._prisma.venueStaff.update({
        where: { id: EXISTING.id },
        data: { role: (_input.role ?? 'STAFF') as never },
      });
      return { created: false, staff: mapRowSV(UPDATED) };
    }

    const CREATED = await this._prisma.venueStaff.create({
      data: {
        venueId: _input.venueId,
        userId: _input.userId,
        role: (_input.role ?? 'STAFF') as never,
      },
    });
    return { created: true, staff: mapRowSV(CREATED) };
  }

  async findByVenueAndUserSV(_venueId: string, _userId: string): Promise<VenueStaffDTO | null> {
    const ROW = await this._prisma.venueStaff.findUnique({
      where: {
        venueId_userId: {
          venueId: _venueId,
          userId: _userId,
        },
      },
    });
    return ROW === null ? null : mapRowSV(ROW);
  }

  async listByVenueIdSV(_venueId: string): Promise<VenueStaffDTO[]> {
    const ROWS = await this._prisma.venueStaff.findMany({
      where: { venueId: _venueId },
      orderBy: { createdAt: 'asc' },
    });
    return ROWS.map(mapRowSV);
  }

  async listByUserIdSV(_userId: string): Promise<VenueStaffDTO[]> {
    const ROWS = await this._prisma.venueStaff.findMany({
      where: { userId: _userId },
      orderBy: { createdAt: 'asc' },
    });
    return ROWS.map(mapRowSV);
  }

  async removeByVenueAndUserSV(_venueId: string, _userId: string): Promise<boolean> {
    const EXISTING = await this._prisma.venueStaff.findUnique({
      where: {
        venueId_userId: {
          venueId: _venueId,
          userId: _userId,
        },
      },
    });
    if (EXISTING === null) return false;

    await this._prisma.venueStaff.delete({ where: { id: EXISTING.id } });
    return true;
  }

  async isUserStaffOfVenueSV(_userId: string, _venueId: string): Promise<boolean> {
    const COUNT = await this._prisma.venueStaff.count({
      where: {
        userId: _userId,
        venueId: _venueId,
      },
    });
    return COUNT > 0;
  }
}

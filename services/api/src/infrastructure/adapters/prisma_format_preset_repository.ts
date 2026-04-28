import type { FormatPresetRepository } from '../../domain/ports/format_preset_repository.js';

import { PRISMA } from '../prisma_client.js';

export class PrismaFormatPresetRepository implements FormatPresetRepository {
  async listActiveFormatPresetsBySportIdSV(_sportId: string, _now: Date) {
    return PRISMA.tournamentFormatPreset.findMany({
      where: {
        sportId: _sportId,
        isActive: true,
        effectiveFrom: { lte: _now },
      },
      distinct: ['code'],
      orderBy: [{ code: 'asc' }, { version: 'desc' }],
      select: {
        id: true,
        sportId: true,
        code: true,
        version: true,
        name: true,
        schemaVersion: true,
        defaultParameters: true,
      },
    });
  }

  async findByIdSV(_id: string) {
    return PRISMA.tournamentFormatPreset.findUnique({
      where: { id: _id },
      select: {
        id: true,
        sportId: true,
        code: true,
        version: true,
        name: true,
        schemaVersion: true,
        defaultParameters: true,
      },
    });
  }

  async findActiveBySportAndCodeSV(_sportId: string, _code: string, _now: Date) {
    return PRISMA.tournamentFormatPreset.findFirst({
      where: {
        sportId: _sportId,
        code: _code,
        isActive: true,
        effectiveFrom: { lte: _now },
      },
      orderBy: { version: 'desc' },
      select: {
        id: true,
        sportId: true,
        code: true,
        version: true,
        name: true,
        schemaVersion: true,
        defaultParameters: true,
      },
    });
  }
}


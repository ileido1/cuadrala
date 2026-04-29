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

  async publishNewVersionSV(_input: {
    sportId: string;
    code: string;
    name: string;
    schemaVersion: number;
    defaultParameters: unknown;
    effectiveFrom?: Date;
  }) {
    const NOW = _input.effectiveFrom ?? new Date();

    return PRISMA.$transaction(async (_tx) => {
      const LATEST = await _tx.tournamentFormatPreset.findFirst({
        where: { sportId: _input.sportId, code: _input.code },
        orderBy: [{ version: 'desc' }],
        select: { id: true, version: true },
      });

      const NEXT_VERSION = (LATEST?.version ?? 0) + 1;

      // Dejar una única versión activa por sport+code.
      await _tx.tournamentFormatPreset.updateMany({
        where: { sportId: _input.sportId, code: _input.code, isActive: true },
        data: { isActive: false },
      });

      const CREATED = await _tx.tournamentFormatPreset.create({
        data: {
          sportId: _input.sportId,
          code: _input.code,
          version: NEXT_VERSION,
          name: _input.name,
          schemaVersion: _input.schemaVersion,
          defaultParameters: _input.defaultParameters as never,
          isActive: true,
          effectiveFrom: NOW,
          supersedesId: LATEST?.id ?? null,
        },
        select: {
          id: true,
          sportId: true,
          code: true,
          version: true,
          name: true,
          schemaVersion: true,
          defaultParameters: true,
          isActive: true,
          effectiveFrom: true,
          supersedesId: true,
        },
      });

      return CREATED;
    });
  }
}


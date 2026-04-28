import { PRISMA } from '../prisma_client.js';

export async function listFormatPresetsBySportRepo(_sportId: string) {
  return PRISMA.tournamentFormatPreset.findMany({
    where: {
      sportId: _sportId,
      isActive: true,
      effectiveFrom: { lte: new Date() },
    },
    // Devuelve solo la versión vigente por code (la mayor version dentro de isActive + effectiveFrom<=now).
    distinct: ['code'],
    orderBy: [{ code: 'asc' }, { version: 'desc' }],
  });
}

export async function findFormatPresetByIdRepo(_id: string) {
  return PRISMA.tournamentFormatPreset.findUnique({ where: { id: _id } });
}

export async function findFormatPresetBySportAndCodeRepo(_sportId: string, _code: string) {
  return PRISMA.tournamentFormatPreset.findFirst({
    where: {
      sportId: _sportId,
      code: _code,
      isActive: true,
      effectiveFrom: { lte: new Date() },
    },
    orderBy: { version: 'desc' },
  });
}

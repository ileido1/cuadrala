import { PRISMA } from '../prisma_client.js';

export async function listFormatPresetsBySportRepo(_sportId: string) {
  return PRISMA.tournamentFormatPreset.findMany({
    where: { sportId: _sportId, isActive: true },
    orderBy: { code: 'asc' },
  });
}

export async function findFormatPresetByIdRepo(_id: string) {
  return PRISMA.tournamentFormatPreset.findUnique({ where: { id: _id } });
}

export async function findFormatPresetBySportAndCodeRepo(_sportId: string, _code: string) {
  return PRISMA.tournamentFormatPreset.findUnique({
    where: {
      sportId_code: {
        sportId: _sportId,
        code: _code,
      },
    },
  });
}

import { PRISMA } from '../prisma_client.js';

export async function listSportsRepo() {
  return PRISMA.sport.findMany({
    orderBy: { code: 'asc' },
  });
}

export async function findSportByIdRepo(_id: string) {
  return PRISMA.sport.findUnique({ where: { id: _id } });
}

export async function findSportByCodeRepo(_code: string) {
  return PRISMA.sport.findUnique({ where: { code: _code } });
}

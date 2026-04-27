import type { Court } from '../../generated/prisma/client.js';

import { PRISMA } from '../prisma_client.js';

export async function findCourtByIdRepo(_id: string): Promise<Court | null> {
  return PRISMA.court.findUnique({ where: { id: _id } });
}

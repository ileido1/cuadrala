import { PRISMA } from '../prisma_client.js';

export async function checkDatabaseReadySV(): Promise<void> {
  // Query mínima y rápida para readiness.
  await PRISMA.$queryRaw`SELECT 1`;
}


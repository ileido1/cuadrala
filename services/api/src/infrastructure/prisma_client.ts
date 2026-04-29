import { PrismaClient } from '../generated/prisma/client.js';
/** Cliente Prisma singleton. */
export const PRISMA = new PrismaClient();

export async function disconnectDatabaseSV(): Promise<void> {
  await PRISMA.$disconnect();
}

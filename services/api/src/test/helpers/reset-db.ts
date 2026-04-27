import { PRISMA } from '../../infrastructure/prisma_client.js';

/** Borra datos en orden seguro de FKs (solo para tests de integración). */
export async function resetDatabaseForTestsSV(): Promise<void> {
  await PRISMA.matchResultScore.deleteMany();
  await PRISMA.matchResult.deleteMany();
  await PRISMA.transaction.deleteMany();
  await PRISMA.matchParticipant.deleteMany();
  await PRISMA.match.deleteMany();
  await PRISMA.rankingEntry.deleteMany();
  await PRISMA.tournamentRegistration.deleteMany();
  await PRISMA.tournament.deleteMany();
  await PRISMA.tournamentFormatPreset.deleteMany();
  await PRISMA.sport.deleteMany();
  await PRISMA.court.deleteMany();
  await PRISMA.venue.deleteMany();
  await PRISMA.user.deleteMany();
  await PRISMA.category.deleteMany();
  await PRISMA.feeRule.deleteMany();
}

import { PRISMA } from '../../infrastructure/prisma_client.js';

/** Borra datos en orden seguro de FKs (solo para tests de integración). */
export async function resetDatabaseForTestsSV(): Promise<void> {
  // Notificaciones (MVP push-notifications). Usamos SQL crudo para no acoplar el helper
  // a modelos Prisma que pueden no existir en DBs antiguas.
  try {
    await PRISMA.$executeRawUnsafe('DELETE FROM "NotificationDelivery"');
  } catch {
    // ignore: tabla no existe
  }
  try {
    await PRISMA.$executeRawUnsafe('DELETE FROM "NotificationEvent"');
  } catch {
    // ignore: tabla no existe
  }
  try {
    await PRISMA.$executeRawUnsafe('DELETE FROM "NotificationSubscription"');
  } catch {
    // ignore: tabla no existe
  }
  try {
    await PRISMA.$executeRawUnsafe('DELETE FROM "DevicePushToken"');
  } catch {
    // ignore: tabla no existe
  }

  // Auth hardening (Sprint 25). SQL crudo para compatibilidad con DBs antiguas.
  try {
    await PRISMA.$executeRawUnsafe('DELETE FROM "RefreshToken"');
  } catch {
    // ignore: tabla no existe
  }

  // Tournament schedule genérico (Sprint 33). SQL crudo para compatibilidad con DBs antiguas.
  try {
    await PRISMA.$executeRawUnsafe('DELETE FROM "TournamentSchedule"');
  } catch {
    // ignore: tabla no existe
  }

  // Chat (Sprint 34). SQL crudo para compatibilidad con DBs antiguas.
  try {
    await PRISMA.$executeRawUnsafe('DELETE FROM "ChatMessage"');
  } catch {
    // ignore: tabla no existe
  }
  try {
    await PRISMA.$executeRawUnsafe('DELETE FROM "ChatThread"');
  } catch {
    // ignore: tabla no existe
  }

  // Receipts (Sprint 28). SQL crudo para compatibilidad con DBs antiguas.
  try {
    await PRISMA.$executeRawUnsafe('DELETE FROM "TransactionReceipt"');
  } catch {
    // ignore: tabla no existe
  }

  // Vacant hours (Sprint 21). SQL crudo para compatibilidad con DBs antiguas.
  try {
    await PRISMA.$executeRawUnsafe('DELETE FROM "VacantHour"');
  } catch {
    // ignore: tabla no existe
  }

  await PRISMA.userRatingHistory.deleteMany();
  await PRISMA.userRating.deleteMany();
  await PRISMA.matchResultConfirmation.deleteMany();
  await PRISMA.matchResultDraft.deleteMany();
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

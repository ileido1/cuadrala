/**
 * Seed idempotente: catálogo multi-deporte (PADEL + preset AMERICANO) y FeeRule MATCH por defecto.
 * Ejecutar: `npx prisma db seed` (requiere DATABASE_URL).
 */
import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

import { Prisma, PrismaClient } from '../src/generated/prisma/client.js';

const DATABASE_URL = process.env.DATABASE_URL;
if (DATABASE_URL === undefined || DATABASE_URL === '') {
  throw new Error('DATABASE_URL es obligatoria para ejecutar el seed.');
}

const POOL = new Pool({ connectionString: DATABASE_URL });
const ADAPTER = new PrismaPg(POOL);
const PRISMA = new PrismaClient({ adapter: ADAPTER });

async function seedCatalog(): Promise<void> {
  const SPORTS_TO_SEED: Array<{ code: string; name: string }> = [
    { code: 'PADEL', name: 'Pádel' },
    { code: 'TENNIS', name: 'Tenis' },
    { code: 'PICKLEBALL', name: 'Pickleball' },
  ];

  const PRESETS_V1: Array<{ code: string; name: string; defaultParameters: Prisma.InputJsonValue }> = [
    { code: 'AMERICANO', name: 'Americano', defaultParameters: {} },
    { code: 'ROUND_ROBIN', name: 'Todos contra todos', defaultParameters: { doubleRound: false } },
  ];

  const SEEDED_SPORTS = await Promise.all(
    SPORTS_TO_SEED.map(async (_sport) =>
      PRISMA.sport.upsert({
        where: { code: _sport.code },
        create: { code: _sport.code, name: _sport.name },
        update: { name: _sport.name },
      }),
    ),
  );

  for (const SPORT of SEEDED_SPORTS) {
    for (const PRESET of PRESETS_V1) {
      const EXISTING = await PRISMA.tournamentFormatPreset.findUnique({
        where: {
          sportId_code_version: {
            sportId: SPORT.id,
            code: PRESET.code,
            version: 1,
          },
        },
        select: { id: true },
      });

      if (EXISTING !== null) {
        // Hardening: si ya existe versionado, NO tocar isActive/effectiveFrom (ni crear v2).
        continue;
      }

      await PRISMA.tournamentFormatPreset.create({
        data: {
          sportId: SPORT.id,
          code: PRESET.code,
          version: 1,
          name: PRESET.name,
          schemaVersion: 1,
          defaultParameters: PRESET.defaultParameters,
          // isActive/effectiveFrom quedan por defaults del schema.
        },
      });
    }
  }

  console.log(
    `[seed] Catálogo: deportes ${SPORTS_TO_SEED.map((_s) => _s.code).join(', ')} y presets v1 AMERICANO, ROUND_ROBIN por deporte.`,
  );
}

async function seedFeeRule(): Promise<void> {
  const EXISTING = await PRISMA.feeRule.findFirst({
    where: { scope: 'MATCH', isActive: true },
  });

  if (EXISTING !== null) {
    console.log('[seed] Ya existe una FeeRule MATCH activa; no se crea otra.');
    return;
  }

  await PRISMA.feeRule.create({
    data: {
      scope: 'MATCH',
      type: 'PERCENTAGE',
      value: new Prisma.Decimal('5.0000'),
      isActive: true,
    },
  });

  console.log('[seed] FeeRule por defecto creada: MATCH, 5% (porcentaje).');
}

async function seedMatchLifecycle(): Promise<void> {
  const SPORT = await PRISMA.sport.findUnique({ where: { code: 'PADEL' } });
  if (SPORT === null) {
    throw new Error('[seed] Falta el deporte PADEL (seedCatalog debió crearlo).');
  }

  const PRESET_AMERICANO = await PRISMA.tournamentFormatPreset.findUnique({
    where: { sportId_code_version: { sportId: SPORT.id, code: 'AMERICANO', version: 1 } },
    select: { id: true },
  });
  if (PRESET_AMERICANO === null) {
    throw new Error('[seed] Falta el preset AMERICANO v1 para PADEL.');
  }

  const CATEGORY = await PRISMA.category.upsert({
    where: { slug: '4ta' },
    create: { slug: '4ta', name: '4ta' },
    update: { name: '4ta' },
  });

  const USERS = await Promise.all(
    [
      { email: 'organizer+seed@cuadrala.dev', name: 'Organizador Seed' },
      { email: 'player1+seed@cuadrala.dev', name: 'Jugador Seed 1' },
      { email: 'player2+seed@cuadrala.dev', name: 'Jugador Seed 2' },
      { email: 'player3+seed@cuadrala.dev', name: 'Jugador Seed 3' },
    ].map(async (_u) =>
      PRISMA.user.upsert({
        where: { email: _u.email },
        create: { email: _u.email, name: _u.name },
        update: { name: _u.name },
      }),
    ),
  );

  await Promise.all(
    USERS.map(async (_u) =>
      PRISMA.playerProfile.upsert({
        where: { userId: _u.id },
        create: { userId: _u.id, dominantHand: 'RIGHT', sidePreference: 'ANY' },
        update: {},
      }),
    ),
  );

  await Promise.all(
    USERS.map(async (_u) =>
      PRISMA.userCategory.upsert({
        where: { userId_categoryId: { userId: _u.id, categoryId: CATEGORY.id } },
        create: { userId: _u.id, categoryId: CATEGORY.id },
        update: {},
      }),
    ),
  );

  const VENUE = await PRISMA.venue.upsert({
    where: { placeId: 'seed:venue:club-cuadrala' },
    create: {
      name: 'Club Cuadrala (Seed)',
      placeId: 'seed:venue:club-cuadrala',
      formattedAddress: 'Av. Seed 123, Ciudad',
      addressCity: 'Ciudad',
      addressCountry: 'AR',
      latitude: -34.6037,
      longitude: -58.3816,
      geocodedAt: new Date(),
    },
    update: {
      name: 'Club Cuadrala (Seed)',
      formattedAddress: 'Av. Seed 123, Ciudad',
      addressCity: 'Ciudad',
      addressCountry: 'AR',
      latitude: -34.6037,
      longitude: -58.3816,
      geocodedAt: new Date(),
    },
  });

  const EXISTING_COURT = await PRISMA.court.findFirst({
    where: { venueId: VENUE.id, name: 'Pista 1' },
    select: { id: true },
  });
  const COURT =
    EXISTING_COURT ??
    (await PRISMA.court.create({
      data: { venueId: VENUE.id, name: 'Pista 1' },
      select: { id: true },
    }));

  const scheduledAt = new Date('2030-01-01T18:00:00.000Z');

  const ORGANIZER = USERS[0]!;
  const PLAYERS = USERS.slice(0, 4);

  const EXISTING_MATCH = await PRISMA.match.findFirst({
    where: {
      organizerUserId: ORGANIZER.id,
      sportId: SPORT.id,
      categoryId: CATEGORY.id,
      type: 'AMERICANO',
      scheduledAt,
    },
    select: { id: true, status: true },
  });

  const MATCH =
    EXISTING_MATCH ??
    (await PRISMA.match.create({
      data: {
        sportId: SPORT.id,
        categoryId: CATEGORY.id,
        organizerUserId: ORGANIZER.id,
        formatPresetId: PRESET_AMERICANO.id,
        formatParameters: { mode: 'seed' } satisfies Prisma.InputJsonValue,
        courtId: COURT.id,
        type: 'AMERICANO',
        status: 'SCHEDULED',
        scheduledAt,
        pricePerPlayerCents: 2000,
        maxParticipants: 4,
      },
      select: { id: true },
    }));

  await Promise.all(
    PLAYERS.map(async (_u, _idx) =>
      PRISMA.matchParticipant.upsert({
        where: { matchId_userId: { matchId: MATCH.id, userId: _u.id } },
        create: {
          matchId: MATCH.id,
          userId: _u.id,
          teamLabel: _idx % 2 === 0 ? 'A' : 'B',
        },
        update: {
          teamLabel: _idx % 2 === 0 ? 'A' : 'B',
        },
      }),
    ),
  );

  // Simulación simple de ciclo de vida: scheduled -> in_progress -> finished
  await PRISMA.match.update({
    where: { id: MATCH.id },
    data: { status: 'IN_PROGRESS' },
  });

  const DRAFT_PAYLOAD: Prisma.InputJsonValue = {
    winnerTeam: 'A',
    sets: [
      { a: 6, b: 3 },
      { a: 6, b: 4 },
    ],
    pointsByUser: Object.fromEntries(
      PLAYERS.map((_u, _idx) => [_u.id, _idx % 2 === 0 ? 21 : 15]),
    ),
    notes: 'Resultado propuesto por seed',
  };

  const DRAFT = await PRISMA.matchResultDraft.upsert({
    where: { matchId_version: { matchId: MATCH.id, version: 1 } },
    create: {
      matchId: MATCH.id,
      version: 1,
      status: 'DRAFT',
      payload: DRAFT_PAYLOAD,
      proposedByUserId: ORGANIZER.id,
    },
    update: {
      payload: DRAFT_PAYLOAD,
      proposedByUserId: ORGANIZER.id,
    },
    select: { id: true },
  });

  await Promise.all(
    PLAYERS.map(async (_u) =>
      PRISMA.matchResultConfirmation.upsert({
        where: { draftId_userId: { draftId: DRAFT.id, userId: _u.id } },
        create: { draftId: DRAFT.id, userId: _u.id, status: 'CONFIRMED' },
        update: { status: 'CONFIRMED' },
      }),
    ),
  );

  await PRISMA.matchResultDraft.update({
    where: { id: DRAFT.id },
    data: { status: 'FINALIZED' },
  });

  const EXISTING_RESULT = await PRISMA.matchResult.findFirst({
    where: { matchId: MATCH.id },
    select: { id: true },
  });
  const RESULT =
    EXISTING_RESULT ??
    (await PRISMA.matchResult.create({
      data: { matchId: MATCH.id },
      select: { id: true },
    }));

  await Promise.all(
    PLAYERS.map(async (_u, _idx) =>
      PRISMA.matchResultScore.upsert({
        where: { resultId_userId: { resultId: RESULT.id, userId: _u.id } },
        create: {
          resultId: RESULT.id,
          userId: _u.id,
          points: _idx % 2 === 0 ? 21 : 15,
        },
        update: {
          points: _idx % 2 === 0 ? 21 : 15,
        },
      }),
    ),
  );

  await PRISMA.match.update({
    where: { id: MATCH.id },
    data: { status: 'FINISHED' },
  });

  console.log(
    `[seed] Match lifecycle: creado partido ${MATCH.id} (PADEL/4ta) con ${PLAYERS.length} jugadores, draft+confirmaciones y resultado final.`,
  );
}

async function main(): Promise<void> {
  await seedCatalog();
  await seedFeeRule();
  await seedMatchLifecycle();
}

void main()
  .catch((_error) => {
    console.error('[seed] Error:', _error);
    process.exit(1);
  })
  .finally(async () => {
    await PRISMA.$disconnect();
    await POOL.end();
  });

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
    { code: 'SINGLE_ELIMINATION', name: 'Eliminación simple', defaultParameters: { thirdPlaceMatch: false } },
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

async function seedVenueOwner(): Promise<void> {
  const bcryptModule = await import('bcryptjs');
  const bcrypt = bcryptModule.default ?? bcryptModule;
  const PASSWORD_HASH = bcrypt.hashSync('password123', 10);

  console.log('[seed] Hash generado:', PASSWORD_HASH.substring(0, 30) + '...');

  const OWNER = await PRISMA.user.upsert({
    where: { email: 'owner@cuadrala.dev' },
    create: {
      email: 'owner@cuadrala.dev',
      name: 'Owner Cuádrala',
      passwordHash: PASSWORD_HASH,
    },
    update: {
      name: 'Owner Cuádrala',
      passwordHash: PASSWORD_HASH, // Actualizar passwordHash siempre
    },
  });

  // Obtener primer venue
  const VENUE = await PRISMA.venue.findFirst({
    where: { placeId: 'seed:venue:club-cuadrala' },
    select: { id: true, name: true },
  });

  if (VENUE === null) {
    console.log('[seed] No se encontró el venue Club Cuádrala para asignar owner.');
    return;
  }

  // Asignar owner al venue y settear displayCurrency
  await PRISMA.venue.update({
    where: { id: VENUE.id },
    data: { ownerUserId: OWNER.id, displayCurrency: 'USD' },
  });

  // Crear VenueStaff con rol OWNER
  await PRISMA.venueStaff.upsert({
    where: { venueId_userId: { venueId: VENUE.id, userId: OWNER.id } },
    create: { venueId: VENUE.id, userId: OWNER.id, role: 'OWNER' },
    update: { role: 'OWNER' },
  });

  console.log(`[seed] Owner creado: ${OWNER.email} / password123 (hash generado con bcrypt)`);
  console.log(`[seed] Asignado al venue: ${VENUE.name} (${VENUE.id})`);

  // Crear payment methods para el venue (ids UUID fijos para desarrollo)
  const PAYMENT_METHODS = [
    {
      id: 'a1000001-0001-4001-8001-000000000001',
      type: 'CASH',
      name: 'Efectivo',
    },
    {
      id: 'a1000001-0001-4001-8001-000000000002',
      type: 'BANK_TRANSFER',
      name: 'Transferencia Bancaria',
      config: {
        bank: 'Banesco',
        accountNumber: '01234567890123456789',
        idType: 'V',
        idNumber: 'V12345678',
      },
    },
    {
      id: 'a1000001-0001-4001-8001-000000000003',
      type: 'PAGO_MOVIL',
      name: 'Pago Móvil Banesco',
      config: {
        bank: 'Banesco',
        phoneNumber: '+58-412-1234567',
        idType: 'V',
        idNumber: 'V12345678',
      },
    },
  ] as const;

  // Limpiar ids legacy del seed anterior (no eran UUID)
  await PRISMA.venuePaymentMethod.deleteMany({
    where: {
      venueId: VENUE.id,
      id: { startsWith: 'seed-payment-method-' },
    },
  });

  for (let i = 0; i < PAYMENT_METHODS.length; i++) {
    const pm = PAYMENT_METHODS[i]!;
    await PRISMA.venuePaymentMethod.upsert({
      where: { id: pm.id },
      create: {
        id: pm.id,
        venueId: VENUE.id,
        type: pm.type,
        name: pm.name,
        config: (pm.config as Prisma.InputJsonValue | undefined) ?? Prisma.JsonNull,
        position: i,
      },
      update: {
        venueId: VENUE.id,
        type: pm.type,
        name: pm.name,
        config: (pm.config as Prisma.InputJsonValue | undefined) ?? Prisma.JsonNull,
        position: i,
      },
    });
  }

  console.log(`[seed] Payment methods creados para ${VENUE.name}`);

  // Crear exchange rates para Venezuela
  const EXCHANGE_RATES = [
    { countryCode: 'VE', currency: 'USD', rateToBs: 50.0000, source: 'dolarapi.com' },
    { countryCode: 'VE', currency: 'EUR', rateToBs: 55.0000, source: 'dolarapi.com' },
  ];

  for (const rate of EXCHANGE_RATES) {
    await PRISMA.exchangeRate.upsert({
      where: { countryCode_currency: { countryCode: rate.countryCode, currency: rate.currency } },
      create: { countryCode: rate.countryCode, currency: rate.currency, rateToBs: new Prisma.Decimal(rate.rateToBs.toString()), source: rate.source },
      update: { rateToBs: new Prisma.Decimal(rate.rateToBs.toString()), source: rate.source },
    });
  }

  console.log('[seed] Exchange rates creados: VE/USD @ 50 BS, VE/EUR @ 55 BS');
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
    USERS.map(async (_u, _idx) =>
      PRISMA.playerProfile.upsert({
        where: { userId: _u.id },
        create: {
          userId: _u.id,
          dominantHand: 'RIGHT',
          sidePreference: 'ANY',
          documentNumber: `DOC${String(_idx + 1).padStart(6, '0')}`,
        },
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

  const SEED_VENUES: Array<{
    placeId: string;
    name: string;
    formattedAddress: string;
    addressCity: string;
    addressCountry: string;
    latitude: number;
    longitude: number;
    courts: string[];
    phone?: string;
    email?: string;
    description?: string;
    openingHours?: Prisma.InputJsonValue;
  }> = [
    {
      placeId: 'seed:venue:club-cuadrala',
      name: 'Club Cuádrala',
      formattedAddress: 'Caracas, Venezuela',
      addressCity: 'Caracas',
      addressCountry: 'VE',
      latitude: 10.4806,
      longitude: -66.9036,
      courts: ['Cancha 1', 'Cancha 2', 'Cancha 3', 'Cancha 4', 'Cancha 5'],
      phone: '+58-212-555-0100',
      email: 'contacto@clubcuadrala.com',
      description: 'El mejor club de pádel de Caracas con instalaciones de primera clase.',
      openingHours: {
        monday: { open: '07:00', close: '23:00' },
        tuesday: { open: '07:00', close: '23:00' },
        wednesday: { open: '07:00', close: '23:00' },
        thursday: { open: '07:00', close: '23:00' },
        friday: { open: '07:00', close: '23:00' },
        saturday: { open: '08:00', close: '21:00' },
        sunday: { open: '08:00', close: '20:00' },
      } satisfies Prisma.InputJsonValue,
    },
    {
      placeId: 'seed:venue:padel-center',
      name: 'Pádel Center',
      formattedAddress: 'Chacao, Caracas',
      addressCity: 'Caracas',
      addressCountry: 'VE',
      latitude: 10.4925,
      longitude: -66.8576,
      courts: ['Cancha A', 'Cancha B'],
      phone: '+58-212-555-0200',
      email: 'info@padelcenter.com.ve',
      description: 'Centro especializado en pádel con tecnología de última generación.',
      openingHours: {
        monday: { open: '06:00', close: '22:00' },
        tuesday: { open: '06:00', close: '22:00' },
        wednesday: { open: '06:00', close: '22:00' },
        thursday: { open: '06:00', close: '22:00' },
        friday: { open: '06:00', close: '22:00' },
        saturday: { open: '07:00', close: '20:00' },
        sunday: { open: '08:00', close: '18:00' },
      } satisfies Prisma.InputJsonValue,
    },
    {
      placeId: 'seed:venue:la-guaira',
      name: 'Club La Guaira',
      formattedAddress: 'La Guaira, Venezuela',
      addressCity: 'La Guaira',
      addressCountry: 'VE',
      latitude: 10.5995,
      longitude: -66.9333,
      courts: ['Cancha 1'],
      phone: '+58-212-555-0300',
      email: 'clublaguaira@gmail.com',
      description: 'Club tradicional con canchas de pádel y tenis.',
      openingHours: {
        monday: { open: '08:00', close: '20:00' },
        tuesday: { open: '08:00', close: '20:00' },
        wednesday: { open: '08:00', close: '20:00' },
        thursday: { open: '08:00', close: '20:00' },
        friday: { open: '08:00', close: '20:00' },
        saturday: { open: '09:00', close: '18:00' },
        sunday: { open: '09:00', close: '14:00' },
      } satisfies Prisma.InputJsonValue,
    },
  ];

  const SEEDED_VENUES = await Promise.all(
    SEED_VENUES.map(async (_v) =>
      PRISMA.venue.upsert({
        where: { placeId: _v.placeId },
        create: {
          name: _v.name,
          placeId: _v.placeId,
          formattedAddress: _v.formattedAddress,
          addressCity: _v.addressCity,
          addressCountry: _v.addressCountry,
          latitude: _v.latitude,
          longitude: _v.longitude,
          geocodedAt: new Date(),
          phone: _v.phone,
          email: _v.email,
          description: _v.description,
          openingHours: _v.openingHours,
        },
        update: {
          name: _v.name,
          formattedAddress: _v.formattedAddress,
          addressCity: _v.addressCity,
          addressCountry: _v.addressCountry,
          latitude: _v.latitude,
          longitude: _v.longitude,
          geocodedAt: new Date(),
          phone: _v.phone,
          email: _v.email,
          description: _v.description,
          openingHours: _v.openingHours,
        },
        select: { id: true, name: true, placeId: true },
      }),
    ),
  );

  // Para el match demo, usa el primer venue y su primera cancha.
  const VENUE0 = SEEDED_VENUES[0]!;
  const courtsForVenue0 = SEED_VENUES[0]!.courts;

  await Promise.all(
    SEEDED_VENUES.map(async (_seeded, _idx) => {
      const courtNames = SEED_VENUES[_idx]!.courts;
      await Promise.all(
        courtNames.map(async (_courtName) => {
          const existing = await PRISMA.court.findFirst({
            where: { venueId: _seeded.id, name: _courtName },
            select: { id: true },
          });
          if (existing !== null) return;
          await PRISMA.court.create({
            data: {
              venueId: _seeded.id,
              name: _courtName,
              pricePerHourCents: 850000, // $8.500/hr en centavos
              capacity: '4v4',
              durationMinutes: 60,
            },
          });
        }),
      );
    }),
  );

  const COURT_ROW = await PRISMA.court.findFirst({
    where: { venueId: VENUE0.id, name: courtsForVenue0[0]! },
    select: { id: true },
  });
  if (COURT_ROW === null) {
    throw new Error('[seed] No se pudo crear/encontrar la cancha seed para el venue principal.');
  }
  const COURT = { id: COURT_ROW.id };

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
  await seedVenueOwner();
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

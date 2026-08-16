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

async function seedCatalogSV(): Promise<void> {
  const SPORTS_TO_SEED: Array<{ code: string; name: string }> = [
    { code: 'PADEL', name: 'Pádel' },
    { code: 'TENNIS', name: 'Tenis' },
    { code: 'PICKLEBALL', name: 'Pickleball' },
    { code: 'FOOTBALL5', name: 'Fútbol 5' },
    { code: 'BASKETBALL3X3', name: 'Básquet 3×3' },
    { code: 'VOLLEY_BEACH', name: 'Vóley playa' },
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

async function seedFeeRuleSV(): Promise<void> {
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

async function seedVenuesSV(): Promise<void> {
  //? 1. Definir venues seed con datos completos y realistas
  const SEED_VENUES: Array<{
    placeId: string;
    name: string;
    formattedAddress: string;
    addressCity: string;
    addressCountry: string;
    latitude: number;
    longitude: number;
    courts: Array<{ name: string; indoor: boolean; surfaceType: string }>;
    phone?: string;
    email?: string;
    description?: string;
    openingHours?: Prisma.InputJsonValue;
    averageRating?: number;
  }> = [
    {
      placeId: 'seed:venue:club-cuadrala',
      name: 'Club Cuádrala',
      formattedAddress: 'Avenida Principal, Edificio Cuádrala, Caracas, Venezuela',
      addressCity: 'Caracas',
      addressCountry: 'VE',
      latitude: 10.4806,
      longitude: -66.9036,
      averageRating: 4.8,
      courts: [
        { name: 'Cancha 1 — Premium', indoor: true, surfaceType: 'Sintético premium' },
        { name: 'Cancha 2 — Premium', indoor: true, surfaceType: 'Sintético premium' },
        { name: 'Cancha 3 — Standard', indoor: false, surfaceType: 'Sintético standard' },
        { name: 'Cancha 4 — Standard', indoor: false, surfaceType: 'Sintético standard' },
        { name: 'Cancha 5 — Night', indoor: false, surfaceType: 'Sintético iluminado' },
      ],
      phone: '+58-212-555-0100',
      email: 'contacto@clubcuadrala.com',
      description: 'El mejor club de pádel de Caracas con instalaciones de primera clase, canchas cubiertas y al aire libre.',
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
      name: 'Pádel Center Chacao',
      formattedAddress: 'Calle Francisco de Miranda, Chacao, Caracas, Venezuela',
      addressCity: 'Caracas',
      addressCountry: 'VE',
      latitude: 10.4925,
      longitude: -66.8576,
      averageRating: 4.6,
      courts: [
        { name: 'Cancha A — Iluminada', indoor: false, surfaceType: 'Sintético con iluminación LED' },
        { name: 'Cancha B — Iluminada', indoor: false, surfaceType: 'Sintético con iluminación LED' },
        { name: 'Cancha C — Indoor', indoor: true, surfaceType: 'Sintético hardcourt' },
      ],
      phone: '+58-212-555-0200',
      email: 'info@padelcenter.com.ve',
      description: 'Centro especializado en pádel con tecnología de última generación, iluminación LED nocturna y canchas cubiertas.',
      openingHours: {
        monday: { open: '06:00', close: '22:00' },
        tuesday: { open: '06:00', close: '22:00' },
        wednesday: { open: '06:00', close: '22:00' },
        thursday: { open: '06:00', close: '22:00' },
        friday: { open: '06:00', close: '23:00' },
        saturday: { open: '07:00', close: '21:00' },
        sunday: { open: '08:00', close: '19:00' },
      } satisfies Prisma.InputJsonValue,
    },
    {
      placeId: 'seed:venue:canchas-sur',
      name: 'Canchas del Sur',
      formattedAddress: 'Avenida Urdaneta, Barrio Sur, Caracas, Venezuela',
      addressCity: 'Caracas',
      addressCountry: 'VE',
      latitude: 10.4600,
      longitude: -66.9300,
      averageRating: 4.3,
      courts: [
        { name: 'Cancha Sur 1', indoor: false, surfaceType: 'Tierra batida roja' },
        { name: 'Cancha Sur 2', indoor: false, surfaceType: 'Tierra batida roja' },
        { name: 'Cancha Sur 3', indoor: false, surfaceType: 'Cemento' },
      ],
      phone: '+58-212-555-0300',
      email: 'contacto@canchasursur.ve',
      description: 'Instalaciones de pádel tradicionales en el sur de Caracas, opciones de canchas roja y cemento.',
      openingHours: {
        monday: { open: '08:00', close: '20:00' },
        tuesday: { open: '08:00', close: '20:00' },
        wednesday: { open: '08:00', close: '20:00' },
        thursday: { open: '08:00', close: '20:00' },
        friday: { open: '08:00', close: '21:00' },
        saturday: { open: '09:00', close: '19:00' },
        sunday: { open: '09:00', close: '17:00' },
      } satisfies Prisma.InputJsonValue,
    },
  ];

  //? 2. Crear/actualizar venues
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
          averageRating: _v.averageRating ?? null,
          displayCurrency: 'USD',
          pricingCurrency: 'USD',
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
          averageRating: _v.averageRating ?? null,
        },
        select: { id: true, name: true, placeId: true },
      }),
    ),
  );

  //? 3. Crear courts para cada venue
  await Promise.all(
    SEEDED_VENUES.map(async (_seeded, _idx) => {
      const COURT_DEFS = SEED_VENUES[_idx]!.courts;
      await Promise.all(
        COURT_DEFS.map(async (_courtDef) => {
          const EXISTING = await PRISMA.court.findFirst({
            where: { venueId: _seeded.id, name: _courtDef.name },
            select: { id: true },
          });
          if (EXISTING !== null) return;
          await PRISMA.court.create({
            data: {
              venueId: _seeded.id,
              name: _courtDef.name,
              sportType: 'PADEL',
              indoor: _courtDef.indoor,
              lighting: _courtDef.indoor || _courtDef.surfaceType.includes('iluminación') || _courtDef.surfaceType.includes('iluminado'),
              surfaceType: _courtDef.surfaceType,
              pricePerHourCents: 2000, // $20.00/hora en centavos
              capacity: '4v4',
              durationMinutes: 60,
              status: 'ACTIVE',
            },
          });
        }),
      );
    }),
  );

  console.log(`[seed] ${SEEDED_VENUES.length} venues creados con ${SEED_VENUES.reduce((sum, v) => sum + v.courts.length, 0)} canchas totales.`);
}

async function seedTestUsersSV(): Promise<Array<{ id: string; email: string; name: string }>> {
  //? 1. Generar hash de contraseña
  const bcryptModule = await import('bcryptjs');
  const bcrypt = bcryptModule.default ?? bcryptModule;
  const PASSWORD_HASH = bcrypt.hashSync('password123', 10);

  //? 2. Definir usuarios seed con roles variados
  const TEST_USERS: Array<{ email: string; name: string }> = [
    { email: 'owner@test.dev', name: 'Owner Cuádrala' },
    { email: 'organizer@test.dev', name: 'Organizador Principal' },
    { email: 'player1@test.dev', name: 'Jugador Profesional 1' },
    { email: 'player2@test.dev', name: 'Jugador Profesional 2' },
    { email: 'player3@test.dev', name: 'Jugador Intermedio 1' },
    { email: 'player4@test.dev', name: 'Jugador Intermedio 2' },
    { email: 'player5@test.dev', name: 'Jugador Básico 1' },
    { email: 'player6@test.dev', name: 'Jugador Básico 2' },
  ];

  //? 3. Crear/actualizar usuarios
  const CREATED_USERS = await Promise.all(
    TEST_USERS.map(async (_u) =>
      PRISMA.user.upsert({
        where: { email: _u.email },
        create: {
          email: _u.email,
          name: _u.name,
          passwordHash: PASSWORD_HASH,
        },
        update: {
          name: _u.name,
          passwordHash: PASSWORD_HASH,
        },
      }),
    ),
  );

  //? 4. Crear perfiles de jugador para cada usuario
  await Promise.all(
    CREATED_USERS.map(async (_u, _idx) =>
      PRISMA.playerProfile.upsert({
        where: { userId: _u.id },
        create: {
          userId: _u.id,
          dominantHand: _idx % 3 === 0 ? 'LEFT' : 'RIGHT',
          sidePreference: _idx % 2 === 0 ? 'RIGHT' : 'LEFT',
          documentNumber: `DOC${String(_idx + 1).padStart(8, '0')}`,
          phone: `+58-412-${String(_idx * 111).padStart(7, '0')}`,
          city: 'Caracas',
        },
        update: {},
      }),
    ),
  );

  console.log(`[seed] ${CREATED_USERS.length} usuarios de prueba creados con perfiles de jugador.`);
  return CREATED_USERS;
}

async function seedVenueOwnerSV(_venueId: string, _userId: string): Promise<void> {
  //? 1. Asignar propietario a la sede con monedas
  const SETTLEMENT_CURRENCY = 'USD' as const;
  await PRISMA.venue.update({
    where: { id: _venueId },
    data: {
      ownerUserId: _userId,
      displayCurrency: 'USD',
      pricingCurrency: SETTLEMENT_CURRENCY,
    },
  });

  //? 2. Crear rol VenueStaff OWNER
  await PRISMA.venueStaff.upsert({
    where: { venueId_userId: { venueId: _venueId, userId: _userId } },
    create: { venueId: _venueId, userId: _userId, role: 'OWNER' },
    update: { role: 'OWNER' },
  });

  //? 3. Crear métodos de pago para el venue
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

  for (let i = 0; i < PAYMENT_METHODS.length; i++) {
    const pm = PAYMENT_METHODS[i]!;
    await PRISMA.venuePaymentMethod.upsert({
      where: { id: pm.id },
      create: {
        id: pm.id,
        venueId: _venueId,
        type: pm.type,
        name: pm.name,
        config: (pm.config as Prisma.InputJsonValue | undefined) ?? Prisma.JsonNull,
        settlementCurrency: SETTLEMENT_CURRENCY,
        position: i,
      },
      update: {
        type: pm.type,
        name: pm.name,
        config: (pm.config as Prisma.InputJsonValue | undefined) ?? Prisma.JsonNull,
        position: i,
      },
    });
  }
}

async function seedExchangeRatesSV(): Promise<void> {
  //? 1. Crear tasas de cambio
  const EXCHANGE_RATES = [
    { countryCode: 'VE', currency: 'USD', rateToBs: 50.0000, source: 'dolarapi.com' },
    { countryCode: 'VE', currency: 'EUR', rateToBs: 55.0000, source: 'dolarapi.com' },
  ];

  const EFFECTIVE_DATE = new Date(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Caracas',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date()) + 'T00:00:00.000Z',
  );

  //? 2. Upsert tasas de cambio
  await Promise.all(
    EXCHANGE_RATES.map(async (rate) =>
      PRISMA.exchangeRate.upsert({
        where: {
          countryCode_currency_effectiveDate: {
            countryCode: rate.countryCode,
            currency: rate.currency,
            effectiveDate: EFFECTIVE_DATE,
          },
        },
        create: {
          countryCode: rate.countryCode,
          currency: rate.currency,
          rateToBs: new Prisma.Decimal(rate.rateToBs.toString()),
          source: rate.source,
          effectiveDate: EFFECTIVE_DATE,
        },
        update: {
          rateToBs: new Prisma.Decimal(rate.rateToBs.toString()),
          source: rate.source,
        },
      }),
    ),
  );

  console.log('[seed] Tasas de cambio creadas: VE/USD @ 50 BS, VE/EUR @ 55 BS');
}

async function seedSportCategoriesSV(): Promise<void> {
  const RACKET_ORDINALS: Array<{
    slug: string;
    name: string;
    skillBand: 'BASIC' | 'INTERMEDIATE' | 'ADVANCED';
    sortOrder: number;
  }> = [
    { slug: '8va', name: '8va', skillBand: 'BASIC', sortOrder: 8 },
    { slug: '7ma', name: '7ma', skillBand: 'BASIC', sortOrder: 7 },
    { slug: '6ta', name: '6ta', skillBand: 'INTERMEDIATE', sortOrder: 6 },
    { slug: '5ta', name: '5ta', skillBand: 'INTERMEDIATE', sortOrder: 5 },
    { slug: '4ta', name: '4ta', skillBand: 'INTERMEDIATE', sortOrder: 4 },
    { slug: '3ra', name: '3ra', skillBand: 'ADVANCED', sortOrder: 3 },
    { slug: '2da', name: '2da', skillBand: 'ADVANCED', sortOrder: 2 },
    { slug: '1ra', name: '1ra', skillBand: 'ADVANCED', sortOrder: 1 },
  ];

  const TEAM_TIERS: Array<{
    slug: string;
    name: string;
    skillBand: 'BASIC' | 'INTERMEDIATE' | 'ADVANCED';
    sortOrder: number;
  }> = [
    { slug: 'recreativo', name: 'Recreativo', skillBand: 'BASIC', sortOrder: 1 },
    { slug: 'intermedio', name: 'Intermedio', skillBand: 'INTERMEDIATE', sortOrder: 2 },
    { slug: 'competitivo', name: 'Competitivo', skillBand: 'ADVANCED', sortOrder: 3 },
  ];

  const RACKET_CODES = ['PADEL', 'TENNIS', 'PICKLEBALL'];
  const TEAM_CODES = ['FOOTBALL5', 'BASKETBALL3X3', 'VOLLEY_BEACH'];

  //? 1. Crear categorías de deporte de raqueta (ordinales 8va–1ra)
  for (const CODE of RACKET_CODES) {
    const SPORT = await PRISMA.sport.findUnique({ where: { code: CODE } });
    if (SPORT === null) continue;
    for (const DEF of RACKET_ORDINALS) {
      await PRISMA.category.upsert({
        where: { sportId_slug: { sportId: SPORT.id, slug: DEF.slug } },
        create: {
          sportId: SPORT.id,
          slug: DEF.slug,
          name: DEF.name,
          scheme: 'RACKET_ORDINAL',
          skillBand: DEF.skillBand,
          sortOrder: DEF.sortOrder,
        },
        update: {
          name: DEF.name,
          scheme: 'RACKET_ORDINAL',
          skillBand: DEF.skillBand,
          sortOrder: DEF.sortOrder,
        },
      });
    }
  }

  //? 2. Crear categorías de deporte de equipo (niveles: recreativo/intermedio/competitivo)
  for (const CODE of TEAM_CODES) {
    const SPORT = await PRISMA.sport.findUnique({ where: { code: CODE } });
    if (SPORT === null) continue;
    for (const DEF of TEAM_TIERS) {
      await PRISMA.category.upsert({
        where: { sportId_slug: { sportId: SPORT.id, slug: DEF.slug } },
        create: {
          sportId: SPORT.id,
          slug: DEF.slug,
          name: DEF.name,
          scheme: 'TEAM_SKILL',
          skillBand: DEF.skillBand,
          sortOrder: DEF.sortOrder,
        },
        update: {
          name: DEF.name,
          scheme: 'TEAM_SKILL',
          skillBand: DEF.skillBand,
          sortOrder: DEF.sortOrder,
        },
      });
    }
  }

  console.log('[seed] Categorías por deporte: ordinales 8va–1ra (raqueta) y 3 tiers equipo.');
}

async function seedTestMatchesSV(_users: Array<{ id: string; email: string; name: string }>): Promise<void> {
  //? 1. Cargar deporte PADEL y preset AMERICANO
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

  //? 2. Cargar categorías PADEL
  const CATEGORY_4TA = await PRISMA.category.findFirst({
    where: { sportId: SPORT.id, slug: '4ta' },
  });
  const CATEGORY_5TA = await PRISMA.category.findFirst({
    where: { sportId: SPORT.id, slug: '5ta' },
  });
  if (CATEGORY_4TA === null || CATEGORY_5TA === null) {
    throw new Error('[seed] Faltan categorías para PADEL (ejecuta seedSportCategories).');
  }

  //? 3. Asignar categorías a usuarios
  await Promise.all(
    _users.map(async (_u, _idx) => {
      const CATEGORY = _idx < 4 ? CATEGORY_4TA : CATEGORY_5TA;
      await PRISMA.userCategory.upsert({
        where: { userId_categoryId: { userId: _u.id, categoryId: CATEGORY.id } },
        create: { userId: _u.id, categoryId: CATEGORY.id },
        update: {},
      });
      await PRISMA.userSportCategory.upsert({
        where: { userId_sportId: { userId: _u.id, sportId: SPORT.id } },
        create: { userId: _u.id, sportId: SPORT.id, categoryId: CATEGORY.id },
        update: { categoryId: CATEGORY.id },
      });
    }),
  );

  //? 4. Obtener venues y courts para los matches
  const VENUE_CUADRALA = await PRISMA.venue.findUnique({
    where: { placeId: 'seed:venue:club-cuadrala' },
    select: { id: true, name: true },
  });
  const VENUE_PADELCENTER = await PRISMA.venue.findUnique({
    where: { placeId: 'seed:venue:padel-center' },
    select: { id: true, name: true },
  });

  if (VENUE_CUADRALA === null || VENUE_PADELCENTER === null) {
    throw new Error('[seed] No se encontraron venues para crear matches.');
  }

  const COURTS_CUADRALA = await PRISMA.court.findMany({
    where: { venueId: VENUE_CUADRALA.id },
    select: { id: true, name: true },
    take: 3,
  });

  const COURTS_PADELCENTER = await PRISMA.court.findMany({
    where: { venueId: VENUE_PADELCENTER.id },
    select: { id: true, name: true },
    take: 2,
  });

  if (COURTS_CUADRALA.length < 1 || COURTS_PADELCENTER.length < 1) {
    throw new Error('[seed] No hay courts disponibles para crear matches.');
  }

  //? 5. Definir matches seed con diferentes estados
  const ORGANIZER = _users[1]!; // organizer@test.dev
  const PLAYERS_4TA = _users.slice(0, 4); // player1-4
  const PLAYERS_5TA = _users.slice(4, 8); // player5-8

  const MATCHES_DEF: Array<{
    name: string;
    category: typeof CATEGORY_4TA;
    court: (typeof COURTS_CUADRALA)[0];
    players: Array<typeof ORGANIZER>;
    status: 'SCHEDULED' | 'IN_PROGRESS' | 'FINISHED';
    scheduledAt: Date;
    withResult: boolean;
  }> = [
    {
      name: 'Americano Futuro (Programado)',
      category: CATEGORY_4TA,
      court: COURTS_CUADRALA[0]!,
      players: PLAYERS_4TA,
      status: 'SCHEDULED',
      scheduledAt: new Date('2030-02-15T18:00:00.000Z'),
      withResult: false,
    },
    {
      name: 'Americano en Vivo',
      category: CATEGORY_4TA,
      court: COURTS_CUADRALA[1]!,
      players: PLAYERS_4TA,
      status: 'IN_PROGRESS',
      scheduledAt: new Date('2026-08-16T16:00:00.000Z'),
      withResult: false,
    },
    {
      name: 'Americano Completado Ayer',
      category: CATEGORY_5TA,
      court: COURTS_PADELCENTER[0]!,
      players: PLAYERS_5TA,
      status: 'FINISHED',
      scheduledAt: new Date('2026-08-15T18:00:00.000Z'),
      withResult: true,
    },
  ];

  //? 6. Crear matches con su ciclo de vida
  for (const MATCH_DEF of MATCHES_DEF) {
    //? 6.1. Verificar si ya existe el match
    const EXISTING_MATCH = await PRISMA.match.findFirst({
      where: {
        organizerUserId: ORGANIZER.id,
        courtId: MATCH_DEF.court.id,
        categoryId: MATCH_DEF.category.id,
        scheduledAt: MATCH_DEF.scheduledAt,
      },
      select: { id: true, status: true },
    });

    if (EXISTING_MATCH !== null && EXISTING_MATCH.status === MATCH_DEF.status) {
      continue; // Ya existe con el estado correcto
    }

    //? 6.2. Crear o actualizar match
    const MATCH =
      EXISTING_MATCH ??
      (await PRISMA.match.create({
        data: {
          sportId: SPORT.id,
          categoryId: MATCH_DEF.category.id,
          organizerUserId: ORGANIZER.id,
          formatPresetId: PRESET_AMERICANO.id,
          formatParameters: { mode: 'seed' } satisfies Prisma.InputJsonValue,
          courtId: MATCH_DEF.court.id,
          type: 'AMERICANO',
          status: 'SCHEDULED',
          scheduledAt: MATCH_DEF.scheduledAt,
          pricePerPlayerCents: 2000,
          maxParticipants: 4,
        },
        select: { id: true },
      }));

    //? 6.3. Agregar participantes (4 jugadores, 2 vs 2)
    for (let i = 0; i < MATCH_DEF.players.length; i++) {
      const PLAYER = MATCH_DEF.players[i]!;
      await PRISMA.matchParticipant.upsert({
        where: { matchId_userId: { matchId: MATCH.id, userId: PLAYER.id } },
        create: {
          matchId: MATCH.id,
          userId: PLAYER.id,
          teamLabel: i % 2 === 0 ? 'A' : 'B',
        },
        update: {
          teamLabel: i % 2 === 0 ? 'A' : 'B',
        },
      });
    }

    //? 6.4. Actualizar estado del match
    if (MATCH_DEF.status !== 'SCHEDULED') {
      await PRISMA.match.update({
        where: { id: MATCH.id },
        data: { status: MATCH_DEF.status },
      });
    }

    //? 6.5. Crear resultado si el match está FINISHED
    if (MATCH_DEF.withResult && MATCH_DEF.status === 'FINISHED') {
      const DRAFT_PAYLOAD: Prisma.InputJsonValue = {
        winnerTeam: 'A',
        sets: [
          { a: 6, b: 3 },
          { a: 6, b: 4 },
        ],
        pointsByUser: Object.fromEntries(
          MATCH_DEF.players.map((_u, _idx) => [_u.id, _idx % 2 === 0 ? 21 : 15]),
        ),
        notes: 'Resultado propuesto por seed — match completado',
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

      //? 6.6. Confirmar resultado de todos los participantes
      await Promise.all(
        MATCH_DEF.players.map(async (_u) =>
          PRISMA.matchResultConfirmation.upsert({
            where: { draftId_userId: { draftId: DRAFT.id, userId: _u.id } },
            create: { draftId: DRAFT.id, userId: _u.id, status: 'CONFIRMED' },
            update: { status: 'CONFIRMED' },
          }),
        ),
      );

      //? 6.7. Finalizar draft
      await PRISMA.matchResultDraft.update({
        where: { id: DRAFT.id },
        data: { status: 'FINALIZED' },
      });

      //? 6.8. Crear MatchResult con scores
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
        MATCH_DEF.players.map(async (_u, _idx) =>
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
    }
  }

  console.log(
    `[seed] ${MATCHES_DEF.length} matches de prueba creados en diferentes estados (SCHEDULED, IN_PROGRESS, FINISHED).`,
  );
}

async function main(): Promise<void> {
  //? 1. Crear catálogo base (deportes, presets, categorías, reglas de comisión)
  await seedCatalogSV();
  await seedSportCategoriesSV();
  await seedFeeRuleSV();

  //? 2. Crear venues con canchas
  await seedVenuesSV();

  //? 3. Crear usuarios de prueba
  const TEST_USERS = await seedTestUsersSV();

  //? 4. Crear tasas de cambio
  await seedExchangeRatesSV();

  //? 5. Asignar owner al primer venue (Club Cuádrala)
  const OWNER = TEST_USERS[0]!;
  const VENUE_CUADRALA = await PRISMA.venue.findUnique({
    where: { placeId: 'seed:venue:club-cuadrala' },
    select: { id: true },
  });
  if (VENUE_CUADRALA !== null) {
    await seedVenueOwnerSV(VENUE_CUADRALA.id, OWNER.id);
    console.log(`[seed] Owner '${OWNER.email}' asignado al venue Club Cuádrala`);
  }

  //? 6. Crear matches de prueba en diferentes estados
  await seedTestMatchesSV(TEST_USERS);

  console.log('[seed] ✅ Seed completado exitosamente — base de datos lista para desarrollo.');
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

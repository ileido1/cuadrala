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

async function main(): Promise<void> {
  await seedCatalog();
  await seedFeeRule();
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

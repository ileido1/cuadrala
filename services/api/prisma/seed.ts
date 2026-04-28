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
  const PADEL = await PRISMA.sport.upsert({
    where: { code: 'PADEL' },
    create: { code: 'PADEL', name: 'Pádel' },
    update: { name: 'Pádel' },
  });

  const AMERICANO_EXISTING = await PRISMA.tournamentFormatPreset.findFirst({
    where: { sportId: PADEL.id, code: 'AMERICANO', version: 1 },
  });
  if (AMERICANO_EXISTING === null) {
    await PRISMA.tournamentFormatPreset.create({
      data: {
        sportId: PADEL.id,
        code: 'AMERICANO',
        version: 1,
        name: 'Americano',
        schemaVersion: 1,
        defaultParameters: {},
        isActive: true,
      },
    });
  } else {
    await PRISMA.tournamentFormatPreset.update({
      where: { id: AMERICANO_EXISTING.id },
      data: { name: 'Americano', isActive: true },
    });
  }

  // Ejemplo de segundo preset (round robin) — mismo deporte, parametrizable.
  const RR_EXISTING = await PRISMA.tournamentFormatPreset.findFirst({
    where: { sportId: PADEL.id, code: 'ROUND_ROBIN', version: 1 },
  });
  if (RR_EXISTING === null) {
    await PRISMA.tournamentFormatPreset.create({
      data: {
        sportId: PADEL.id,
        code: 'ROUND_ROBIN',
        version: 1,
        name: 'Todos contra todos',
        schemaVersion: 1,
        defaultParameters: { doubleRound: false },
        isActive: true,
      },
    });
  } else {
    await PRISMA.tournamentFormatPreset.update({
      where: { id: RR_EXISTING.id },
      data: { name: 'Todos contra todos', isActive: true },
    });
  }

  console.log('[seed] Catálogo: deporte PADEL y presets AMERICANO, ROUND_ROBIN.');
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

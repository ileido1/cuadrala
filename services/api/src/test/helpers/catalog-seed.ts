import { PRISMA } from '../../infrastructure/prisma_client.js';

/** Catálogo mínimo multi-deporte para tests: deporte PADEL y preset AMERICANO. */
export async function ensureTestCatalogSV(): Promise<{
  sportPadelId: string;
  presetAmericanoId: string;
  presetRoundRobinId: string;
}> {
  const PADEL = await PRISMA.sport.upsert({
    where: { code: 'PADEL' },
    create: { code: 'PADEL', name: 'Pádel' },
    update: {},
  });

  const AMERICANO = await PRISMA.tournamentFormatPreset.upsert({
    where: {
      sportId_code: {
        sportId: PADEL.id,
        code: 'AMERICANO',
      },
    },
    create: {
      sportId: PADEL.id,
      code: 'AMERICANO',
      name: 'Americano',
      schemaVersion: 1,
      defaultParameters: {},
      isActive: true,
    },
    update: {},
  });

  const ROUND_ROBIN = await PRISMA.tournamentFormatPreset.upsert({
    where: {
      sportId_code: {
        sportId: PADEL.id,
        code: 'ROUND_ROBIN',
      },
    },
    create: {
      sportId: PADEL.id,
      code: 'ROUND_ROBIN',
      name: 'Todos contra todos',
      schemaVersion: 1,
      defaultParameters: { doubleRound: false },
      isActive: true,
    },
    update: {},
  });

  return {
    sportPadelId: PADEL.id,
    presetAmericanoId: AMERICANO.id,
    presetRoundRobinId: ROUND_ROBIN.id,
  };
}

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

  let AMERICANO = await PRISMA.tournamentFormatPreset.findFirst({
    where: { sportId: PADEL.id, code: 'AMERICANO', version: 1 },
  });
  if (AMERICANO === null) {
    AMERICANO = await PRISMA.tournamentFormatPreset.create({
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
  }

  let ROUND_ROBIN = await PRISMA.tournamentFormatPreset.findFirst({
    where: { sportId: PADEL.id, code: 'ROUND_ROBIN', version: 1 },
  });
  if (ROUND_ROBIN === null) {
    ROUND_ROBIN = await PRISMA.tournamentFormatPreset.create({
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
  }

  return {
    sportPadelId: PADEL.id,
    presetAmericanoId: AMERICANO.id,
    presetRoundRobinId: ROUND_ROBIN.id,
  };
}

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

  // Nota: en DBs sin migración de versioning, la columna `version` no existe.
  // Para evitar que toda la suite falle por una DB desactualizada, buscamos por code+sportId
  // y solo aplicamos version=1 cuando la migración fue aplicada.
  let AMERICANO = await PRISMA.tournamentFormatPreset.findFirst({
    where: { sportId: PADEL.id, code: 'AMERICANO' },
    orderBy: [{ schemaVersion: 'desc' }],
  });
  if (AMERICANO === null) {
    AMERICANO = await PRISMA.tournamentFormatPreset.create({
      data: {
        sportId: PADEL.id,
        code: 'AMERICANO',
        name: 'Americano',
        schemaVersion: 1,
        defaultParameters: {},
        isActive: true,
      },
    });
  }

  let ROUND_ROBIN = await PRISMA.tournamentFormatPreset.findFirst({
    where: { sportId: PADEL.id, code: 'ROUND_ROBIN' },
    orderBy: [{ schemaVersion: 'desc' }],
  });
  if (ROUND_ROBIN === null) {
    ROUND_ROBIN = await PRISMA.tournamentFormatPreset.create({
      data: {
        sportId: PADEL.id,
        code: 'ROUND_ROBIN',
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

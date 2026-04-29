import { PRISMA } from '../../infrastructure/prisma_client.js';

/** Catálogo mínimo multi-deporte para tests: PADEL + (TENNIS) + presets v1 por deporte. */
export async function ensureTestCatalogSV(): Promise<{
  sportPadelId: string;
  sportTennisId: string;
  sportPickleballId: string;
  presetAmericanoId: string;
  presetRoundRobinId: string;
  presetTennisAmericanoId: string;
  presetTennisRoundRobinId: string;
  presetPickleballAmericanoId: string;
  presetPickleballRoundRobinId: string;
}> {
  const PADEL = await PRISMA.sport.upsert({
    where: { code: 'PADEL' },
    create: { code: 'PADEL', name: 'Pádel' },
    update: {},
  });

  const TENNIS = await PRISMA.sport.upsert({
    where: { code: 'TENNIS' },
    create: { code: 'TENNIS', name: 'Tenis' },
    update: {},
  });

  const PICKLEBALL = await PRISMA.sport.upsert({
    where: { code: 'PICKLEBALL' },
    create: { code: 'PICKLEBALL', name: 'Pickleball' },
    update: {},
  });

  const ensurePresetV1 = async (
    _sportId: string,
    _code: 'AMERICANO' | 'ROUND_ROBIN',
    _name: string,
    _defaultParameters: object,
  ) => {
    const EXISTING = await PRISMA.tournamentFormatPreset.findUnique({
      where: { sportId_code_version: { sportId: _sportId, code: _code, version: 1 } },
    });
    if (EXISTING !== null) return EXISTING;

    return PRISMA.tournamentFormatPreset.create({
      data: {
        sportId: _sportId,
        code: _code,
        version: 1,
        name: _name,
        schemaVersion: 1,
        defaultParameters: _defaultParameters,
      },
    });
  };

  const [AMERICANO, ROUND_ROBIN] = await Promise.all([
    ensurePresetV1(PADEL.id, 'AMERICANO', 'Americano', {}),
    ensurePresetV1(PADEL.id, 'ROUND_ROBIN', 'Todos contra todos', { doubleRound: false }),
  ]);

  const [TENNIS_AMERICANO, TENNIS_ROUND_ROBIN] = await Promise.all([
    ensurePresetV1(TENNIS.id, 'AMERICANO', 'Americano', {}),
    ensurePresetV1(TENNIS.id, 'ROUND_ROBIN', 'Todos contra todos', { doubleRound: false }),
  ]);

  const [PICKLEBALL_AMERICANO, PICKLEBALL_ROUND_ROBIN] = await Promise.all([
    ensurePresetV1(PICKLEBALL.id, 'AMERICANO', 'Americano', {}),
    ensurePresetV1(PICKLEBALL.id, 'ROUND_ROBIN', 'Todos contra todos', { doubleRound: false }),
  ]);

  return {
    sportPadelId: PADEL.id,
    sportTennisId: TENNIS.id,
    sportPickleballId: PICKLEBALL.id,
    presetAmericanoId: AMERICANO.id,
    presetRoundRobinId: ROUND_ROBIN.id,
    presetTennisAmericanoId: TENNIS_AMERICANO.id,
    presetTennisRoundRobinId: TENNIS_ROUND_ROBIN.id,
    presetPickleballAmericanoId: PICKLEBALL_AMERICANO.id,
    presetPickleballRoundRobinId: PICKLEBALL_ROUND_ROBIN.id,
  };
}
